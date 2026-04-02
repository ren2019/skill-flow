#[tauri::command]
pub fn ping() -> &'static str {
    "ok"
}
