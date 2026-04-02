pub mod bridge;
pub mod config;
pub mod menu;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![bridge::ping])
        .run(tauri::generate_context!())
        .expect("failed to run skill flow desktop");
}
