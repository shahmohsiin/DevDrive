mod commands;
mod config;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .manage(commands::files::UploadCancellationState::default())
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            commands::auth::get_auth_state,
            commands::auth::save_tokens,
            commands::auth::clear_tokens,
            commands::auth::get_config,
            commands::auth::update_config,
            // File commands
            commands::files::upload_file,
            commands::files::cancel_upload,
            commands::files::cancel_all_uploads,
            commands::files::download_file,
            commands::files::hash_file,
            commands::files::get_file_size,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
