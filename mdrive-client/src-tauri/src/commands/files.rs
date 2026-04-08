use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::io::ErrorKind;
use std::path::Path;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::{Emitter, State, Window};
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Mutex;

#[derive(Clone, Serialize)]
struct ProgressPayload {
    id: String,
    percentage: f64,
    bytes_sent: u64,
    total_bytes: u64,
}

#[derive(Default)]
pub struct UploadCancellationState {
    flags: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl UploadCancellationState {
    async fn register(&self, transfer_id: &str) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        self.flags
            .lock()
            .await
            .insert(transfer_id.to_string(), flag.clone());
        flag
    }

    async fn cancel(&self, transfer_id: &str) {
        if let Some(flag) = self.flags.lock().await.get(transfer_id).cloned() {
            flag.store(true, Ordering::Relaxed);
        }
    }

    async fn cancel_all(&self) {
        let flags = self
            .flags
            .lock()
            .await
            .values()
            .cloned()
            .collect::<Vec<_>>();

        for flag in flags {
            flag.store(true, Ordering::Relaxed);
        }
    }

    async fn clear(&self, transfer_id: &str) {
        self.flags.lock().await.remove(transfer_id);
    }
}

/// Upload a local file to a presigned URL (PUT request) with progress
#[tauri::command]
pub async fn upload_file(
    window: Window,
    state: State<'_, UploadCancellationState>,
    file_path: String,
    upload_url: String,
    content_type: String,
    transfer_id: String,
) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let file = fs::File::open(&file_path)
        .await
        .map_err(|e| e.to_string())?;
    let metadata = file.metadata().await.map_err(|e| e.to_string())?;
    let total_size = metadata.len();
    let client = reqwest::Client::new();
    let cancel_flag = state.register(&transfer_id).await;

    let result = async {
        let mut reader = file;
        let window_clone = window.clone();
        let stream_id = transfer_id.clone();
        let stream_cancel_flag = cancel_flag.clone();

        let stream = async_stream::stream! {
            let mut bytes_sent = 0;
            let mut buffer = vec![0u8; 16384];

            loop {
                if stream_cancel_flag.load(Ordering::Relaxed) {
                    yield Err::<bytes::Bytes, std::io::Error>(std::io::Error::new(
                        ErrorKind::Interrupted,
                        "Upload cancelled",
                    ));
                    break;
                }

                let n = match reader.read(&mut buffer).await {
                    Ok(n) => n,
                    Err(err) => {
                        yield Err::<bytes::Bytes, std::io::Error>(err);
                        break;
                    }
                };

                if n == 0 {
                    break;
                }

                bytes_sent += n as u64;
                let percentage = (bytes_sent as f64 / total_size as f64) * 100.0;
                let _ = window_clone.emit(
                    "upload-progress",
                    ProgressPayload {
                        id: stream_id.clone(),
                        percentage,
                        bytes_sent,
                        total_bytes: total_size,
                    },
                );

                yield Ok::<bytes::Bytes, std::io::Error>(bytes::Bytes::copy_from_slice(&buffer[..n]));
            }
        };

        let body = reqwest::Body::wrap_stream(stream);

        let response = client
            .put(&upload_url)
            .header("Content-Type", content_type)
            .header("Content-Length", total_size)
            .body(body)
            .send()
            .await
            .map_err(|e| {
                if cancel_flag.load(Ordering::Relaxed) || e.to_string().contains("Upload cancelled") {
                    "Upload cancelled".to_string()
                } else {
                    format!("Upload failed: {}", e)
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Upload failed with status {}: {}", status, body));
        }

        Ok(transfer_id.clone())
    }
    .await;

    state.clear(&transfer_id).await;
    result
}

#[tauri::command]
pub async fn cancel_upload(
    state: State<'_, UploadCancellationState>,
    transfer_id: String,
) -> Result<(), String> {
    state.cancel(&transfer_id).await;
    Ok(())
}

#[tauri::command]
pub async fn cancel_all_uploads(state: State<'_, UploadCancellationState>) -> Result<(), String> {
    state.cancel_all().await;
    Ok(())
}

/// Download a file from a presigned URL to a local path with progress
#[tauri::command]
pub async fn download_file(
    window: Window,
    download_url: String,
    save_path: String,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        return Err(format!("Download failed with status {}", status));
    }

    let total_size = response
        .content_length()
        .ok_or_else(|| "Failed to get content length".to_string())?;
    let mut stream = response.bytes_stream();
    let mut bytes_downloaded = 0;
    
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&save_path).parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let mut file = fs::File::create(&save_path)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let id = save_path.clone();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Error while downloading: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Failed to write to file: {}", e))?;
        
        bytes_downloaded += chunk.len() as u64;
        let percentage = (bytes_downloaded as f64 / total_size as f64) * 100.0;
        
        let _ = window.emit("download-progress", ProgressPayload {
            id: id.clone(),
            percentage,
            bytes_sent: bytes_downloaded,
            total_bytes: total_size,
        });
    }

    Ok(())
}

/// Compute SHA-256 hash of a local file
#[tauri::command]
pub async fn hash_file(file_path: String) -> Result<String, String> {
    let mut file = fs::File::open(&file_path)
        .await
        .map_err(|e| format!("Cannot open file: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 8192];

    loop {
        let n = file
            .read(&mut buffer)
            .await
            .map_err(|e| format!("Read error: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

/// Get file metadata (size in bytes)
#[tauri::command]
pub async fn get_file_size(file_path: String) -> Result<u64, String> {
    let metadata = fs::metadata(&file_path)
        .await
        .map_err(|e| format!("Cannot read file metadata: {}", e))?;
    Ok(metadata.len())
}
