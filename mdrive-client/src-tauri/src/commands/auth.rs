use crate::config::{load_config, save_config, AppConfig};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthState {
    pub is_authenticated: bool,
    pub access_token: Option<String>,
    pub api_url: String,
}

#[tauri::command]
pub fn get_auth_state() -> AuthState {
    let config = load_config();
    AuthState {
        is_authenticated: config.access_token.is_some(),
        access_token: config.access_token,
        api_url: config.api_url,
    }
}

#[tauri::command]
pub fn save_tokens(access_token: String, refresh_token: String) -> Result<(), String> {
    let mut config = load_config();
    config.access_token = Some(access_token);
    config.refresh_token = Some(refresh_token);
    save_config(&config)
}

#[tauri::command]
pub fn clear_tokens() -> Result<(), String> {
    let mut config = load_config();
    config.access_token = None;
    config.refresh_token = None;
    save_config(&config)
}

#[tauri::command]
pub fn get_config() -> AppConfig {
    load_config()
}

#[tauri::command]
pub fn update_config(api_url: Option<String>, default_download_path: Option<String>) -> Result<(), String> {
    let mut config = load_config();
    if let Some(url) = api_url {
        config.api_url = url;
    }
    if let Some(path) = default_download_path {
        config.default_download_path = Some(path);
    }
    save_config(&config)
}
