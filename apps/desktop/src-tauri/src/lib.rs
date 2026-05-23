pub mod bridge;
pub mod config;
pub mod menu;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| Ok(menu::setup(app)?))
        .invoke_handler(tauri::generate_handler![
            bridge::invoke_bridge,
            bridge::clear_metadata_cache,
            bridge::open_external_url,
            bridge::open_path
        ])
        .run(tauri::generate_context!())
        .expect("failed to run skill flow desktop");
}
