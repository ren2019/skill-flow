use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, Runtime,
};

pub const MAIN_MENU_TITLE: &str = "Skill Flow Desktop";
pub const OPEN_HOME_MENU_ID: &str = "open-home";
pub const OPEN_IMPORT_MENU_ID: &str = "open-import";
pub const OPEN_SETTINGS_MENU_ID: &str = "open-settings";
pub const TRAY_ROUTE_EVENT: &str = "desktop://tray-route";

pub fn setup<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let open_home = MenuItemBuilder::with_id(OPEN_HOME_MENU_ID, "Open Home").build(app)?;
    let open_import = MenuItemBuilder::with_id(OPEN_IMPORT_MENU_ID, "Open Import").build(app)?;
    let open_settings = MenuItemBuilder::with_id(OPEN_SETTINGS_MENU_ID, "Open Settings").build(app)?;
    let menu = MenuBuilder::new(app)
        .items(&[&open_home, &open_import, &open_settings])
        .build()?;

    app.set_menu(menu.clone())?;
    app.on_menu_event(handle_menu_event);

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = show_main_window(&tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    if let Some(action_id) = quick_action_id(event.id().as_ref()) {
        let _ = emit_quick_action(app, action_id);
    }
}

fn quick_action_id(raw_id: &str) -> Option<&'static str> {
    match raw_id {
        OPEN_HOME_MENU_ID => Some(OPEN_HOME_MENU_ID),
        OPEN_IMPORT_MENU_ID => Some(OPEN_IMPORT_MENU_ID),
        OPEN_SETTINGS_MENU_ID => Some(OPEN_SETTINGS_MENU_ID),
        _ => None,
    }
}

fn emit_quick_action<R: Runtime>(app: &AppHandle<R>, action_id: &str) -> tauri::Result<()> {
    show_main_window(app)?;
    app.emit(TRAY_ROUTE_EVENT, action_id.to_string())?;
    Ok(())
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        window.unminimize()?;
        window.show()?;
        window.set_focus()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{quick_action_id, OPEN_HOME_MENU_ID, OPEN_IMPORT_MENU_ID, OPEN_SETTINGS_MENU_ID};

    #[test]
    fn quick_action_ids_match_supported_menu_entries() {
        assert_eq!(quick_action_id(OPEN_HOME_MENU_ID), Some(OPEN_HOME_MENU_ID));
        assert_eq!(quick_action_id(OPEN_IMPORT_MENU_ID), Some(OPEN_IMPORT_MENU_ID));
        assert_eq!(quick_action_id(OPEN_SETTINGS_MENU_ID), Some(OPEN_SETTINGS_MENU_ID));
        assert_eq!(quick_action_id("unknown"), None);
    }
}
