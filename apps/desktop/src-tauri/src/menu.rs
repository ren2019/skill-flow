use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Emitter, Manager, Runtime,
};
use std::env;
use sys_locale::get_locale;

pub const MAIN_MENU_TITLE: &str = "Skill Flow Desktop";
pub const OPEN_HOME_MENU_ID: &str = "open-home";
pub const OPEN_IMPORT_MENU_ID: &str = "open-import";
pub const OPEN_SETTINGS_MENU_ID: &str = "open-settings";
pub const TRAY_ROUTE_EVENT: &str = "desktop://tray-route";

pub fn setup<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let locale = detected_locale_tag();
    let open_home = MenuItemBuilder::with_id(OPEN_HOME_MENU_ID, tray_label(OPEN_HOME_MENU_ID, &locale)).build(app)?;
    let open_import = MenuItemBuilder::with_id(OPEN_IMPORT_MENU_ID, tray_label(OPEN_IMPORT_MENU_ID, &locale)).build(app)?;
    let open_settings = MenuItemBuilder::with_id(OPEN_SETTINGS_MENU_ID, tray_label(OPEN_SETTINGS_MENU_ID, &locale)).build(app)?;
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

fn tray_label(action_id: &str, locale: &str) -> &'static str {
    let normalized_locale = normalize_locale_tag(locale);
    let is_zh_hans = normalized_locale == "zh"
        || normalized_locale == "zh-hans"
        || normalized_locale.starts_with("zh-hans-")
        || normalized_locale.starts_with("zh-cn")
        || normalized_locale.starts_with("zh-sg");

    match (action_id, is_zh_hans) {
        (OPEN_HOME_MENU_ID, true) => "打开主页",
        (OPEN_IMPORT_MENU_ID, true) => "打开导入",
        (OPEN_SETTINGS_MENU_ID, true) => "打开设置",
        (OPEN_HOME_MENU_ID, false) => "Open Home",
        (OPEN_IMPORT_MENU_ID, false) => "Open Import",
        (OPEN_SETTINGS_MENU_ID, false) => "Open Settings",
        _ => MAIN_MENU_TITLE,
    }
}

fn normalize_locale_tag(locale: &str) -> String {
    locale
        .trim()
        .split('.')
        .next()
        .unwrap_or(locale)
        .replace('_', "-")
        .to_lowercase()
}

fn detected_locale_tag() -> String {
    if let Some(locale) = get_locale() {
        if !locale.trim().is_empty() {
            return locale;
        }
    }

    for key in ["LC_ALL", "LC_MESSAGES", "LANG"] {
        if let Ok(value) = env::var(key) {
            if !value.trim().is_empty() {
                return value;
            }
        }
    }

    String::from("en")
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
    use super::{
        normalize_locale_tag, quick_action_id, tray_label, OPEN_HOME_MENU_ID, OPEN_IMPORT_MENU_ID, OPEN_SETTINGS_MENU_ID,
    };

    #[test]
    fn quick_action_ids_match_supported_menu_entries() {
        assert_eq!(quick_action_id(OPEN_HOME_MENU_ID), Some(OPEN_HOME_MENU_ID));
        assert_eq!(quick_action_id(OPEN_IMPORT_MENU_ID), Some(OPEN_IMPORT_MENU_ID));
        assert_eq!(quick_action_id(OPEN_SETTINGS_MENU_ID), Some(OPEN_SETTINGS_MENU_ID));
        assert_eq!(quick_action_id("unknown"), None);
    }

    #[test]
    fn tray_labels_follow_supported_locale_tags() {
        assert_eq!(tray_label(OPEN_HOME_MENU_ID, "en-US"), "Open Home");
        assert_eq!(tray_label(OPEN_IMPORT_MENU_ID, "zh-CN"), "打开导入");
        assert_eq!(tray_label(OPEN_SETTINGS_MENU_ID, "zh-Hans-SG"), "打开设置");
    }

    #[test]
    fn normalizes_supported_chinese_locale_tags() {
        assert_eq!(normalize_locale_tag("zh_CN.UTF-8"), "zh-cn");
        assert_eq!(normalize_locale_tag("zh-Hans-SG"), "zh-hans-sg");
    }
}
