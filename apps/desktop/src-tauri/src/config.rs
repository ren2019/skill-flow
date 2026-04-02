use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub const APP_NAME: &str = "Skill Flow Desktop";
pub const APP_IDENTIFIER: &str = "com.skillflow.desktop";
pub const BRIDGE_HELPER_OVERRIDE_ENV: &str = "SKILL_FLOW_DESKTOP_HELPER_OVERRIDE";
pub const BRIDGE_HELPER_RESOURCE_NAME: &str = "bridge-helper";

#[derive(Clone, Debug)]
pub struct BridgeShellInvocation {
    pub executable_path: PathBuf,
    pub args: [&'static str; 2],
}

pub fn resolve_bridge_shell_invocation(app: &AppHandle) -> Result<BridgeShellInvocation, String> {
    if cfg!(debug_assertions) {
        if let Some(helper_override) = helper_override_path() {
            return Ok(BridgeShellInvocation {
                executable_path: helper_override,
                args: ["bridge", "--json"],
            });
        }
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("failed to resolve bundled helper path: {error}"))?;

    Ok(BridgeShellInvocation {
        executable_path: resource_dir.join(BRIDGE_HELPER_RESOURCE_NAME),
        args: ["bridge", "--json"],
    })
}

fn helper_override_path() -> Option<PathBuf> {
    let override_path = std::env::var(BRIDGE_HELPER_OVERRIDE_ENV).ok()?;
    let trimmed = override_path.trim();
    if trimmed.is_empty() {
        return None;
    }

    Some(PathBuf::from(trimmed))
}
