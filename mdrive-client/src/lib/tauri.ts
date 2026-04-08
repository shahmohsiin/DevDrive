import { invoke } from "@tauri-apps/api/core";

// ─── Types ───────────────────────────────────────────────────

interface AuthState {
  is_authenticated: boolean;
  access_token: string | null;
  api_url: string;
}

interface AppConfig {
  api_url: string;
  access_token: string | null;
  refresh_token: string | null;
  default_download_path: string | null;
}

// ─── Config / Auth State ─────────────────────────────────────

export async function getAuthState(): Promise<AuthState> {
  return invoke<AuthState>("get_auth_state");
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  return invoke("save_tokens", {
    accessToken,
    refreshToken,
  });
}

export async function clearTokens(): Promise<void> {
  return invoke("clear_tokens");
}

export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}

export async function updateConfig(params: {
  apiUrl?: string;
  defaultDownloadPath?: string;
}): Promise<void> {
  return invoke("update_config", {
    apiUrl: params.apiUrl ?? null,
    defaultDownloadPath: params.defaultDownloadPath ?? null,
  });
}

// ─── File Operations ─────────────────────────────────────────

export async function uploadFile(
  filePath: string,
  uploadUrl: string,
  contentType: string,
  transferId: string
): Promise<string> {
  return invoke<string>("upload_file", {
    filePath,
    uploadUrl,
    contentType,
    transferId,
  });
}

export async function cancelUpload(transferId: string): Promise<void> {
  return invoke("cancel_upload", { transferId });
}

export async function cancelAllUploads(): Promise<void> {
  return invoke("cancel_all_uploads");
}

export async function downloadFile(
  downloadUrl: string,
  savePath: string
): Promise<void> {
  return invoke("download_file", { downloadUrl, savePath });
}

export async function hashFile(filePath: string): Promise<string> {
  return invoke<string>("hash_file", { filePath });
}

export async function getFileSize(filePath: string): Promise<number> {
  return invoke<number>("get_file_size", { filePath });
}
