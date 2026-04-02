use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub const APP_NAME: &str = "Skill Flow Desktop";
pub const APP_IDENTIFIER: &str = "com.skillflow.desktop";
pub const BRIDGE_HELPER_OVERRIDE_ENV: &str = "SKILL_FLOW_DESKTOP_HELPER_OVERRIDE";
pub const BRIDGE_HELPER_RESOURCE_PATH: &str = "helper/dist/cli.js";
pub const NODE_COMMAND: &str = "node";

#[derive(Clone, Debug)]
pub struct BridgeShellInvocation {
    pub command: String,
    pub args: Vec<String>,
}

pub fn resolve_bridge_shell_invocation(app: &AppHandle) -> Result<BridgeShellInvocation, String> {
    if cfg!(debug_assertions) {
        if let Some(helper_override) = helper_override_path() {
            return helper_invocation(helper_override);
        }
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("failed to resolve bundled helper path: {error}"))?;
    let helper_path = resource_dir.join(BRIDGE_HELPER_RESOURCE_PATH);

    if !helper_path.exists() {
        return Err(format!(
            "bundled CLI helper is missing at {}",
            helper_path.display()
        ));
    }

    helper_invocation(helper_path)
}

fn helper_override_path() -> Option<PathBuf> {
    let override_path = std::env::var(BRIDGE_HELPER_OVERRIDE_ENV).ok()?;
    let trimmed = override_path.trim();
    if trimmed.is_empty() {
        return None;
    }

    Some(PathBuf::from(trimmed))
}

fn helper_invocation(helper_path: PathBuf) -> Result<BridgeShellInvocation, String> {
    let helper_path = helper_path
        .to_str()
        .ok_or_else(|| format!("bridge helper path is not valid UTF-8: {}", helper_path.display()))?;

    Ok(BridgeShellInvocation {
        command: NODE_COMMAND.to_owned(),
        args: vec![helper_path.to_owned(), "bridge".to_owned(), "--json".to_owned()],
    })
}
