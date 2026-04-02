use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub const APP_NAME: &str = "Skill Flow Desktop";
pub const APP_IDENTIFIER: &str = "com.skillflow.desktop";
pub const BRIDGE_HELPER_OVERRIDE_ENV: &str = "SKILL_FLOW_DESKTOP_HELPER_OVERRIDE";
pub const BRIDGE_HELPER_RESOURCE_PATH: &str = "helper/dist/cli.js";
pub const NODE_COMMAND_FALLBACK: &str = "node";
pub const NODE_COMMAND_CANDIDATES: [&str; 3] = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"];

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
        command: resolve_node_command(),
        args: vec![helper_path.to_owned(), "bridge".to_owned(), "--json".to_owned()],
    })
}

fn resolve_node_command() -> String {
    resolve_node_command_from_candidates(&NODE_COMMAND_CANDIDATES)
}

fn resolve_node_command_from_candidates(candidates: &[&str]) -> String {
    for candidate in candidates {
        if std::path::Path::new(candidate).exists() {
            return (*candidate).to_owned();
        }
    }

    NODE_COMMAND_FALLBACK.to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn prefers_first_existing_node_candidate() {
        let temp_dir = std::env::temp_dir().join(format!("skill-flow-node-test-{}", std::process::id()));
        fs::create_dir_all(&temp_dir).expect("create temp dir");
        let node_path = temp_dir.join("node");
        fs::write(&node_path, "").expect("create node candidate");

        let fallback_path = temp_dir.join("missing-node");
        let selected = resolve_node_command_from_candidates(&[
            fallback_path.to_str().expect("fallback path utf8"),
            node_path.to_str().expect("node path utf8"),
        ]);

        assert_eq!(selected, node_path.to_str().expect("node path utf8"));

        let _ = fs::remove_file(node_path);
        let _ = fs::remove_dir_all(temp_dir);
    }
}
