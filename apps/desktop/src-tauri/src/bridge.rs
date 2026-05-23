use std::io::{ErrorKind, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use tauri::{AppHandle, Manager};

use crate::config::resolve_bridge_shell_invocation;

#[tauri::command]
pub async fn invoke_bridge(app: AppHandle, request_json: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || run_invoke_bridge(app, request_json))
        .await
        .map_err(|error| format!("failed to join bridge task: {error}"))?
}

#[tauri::command]
pub async fn clear_metadata_cache(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || run_clear_metadata_cache(app))
        .await
        .map_err(|error| format!("failed to join maintenance task: {error}"))?
}

#[tauri::command]
pub async fn open_path(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || run_open_target(&path, OpenTargetKind::Path))
        .await
        .map_err(|error| format!("failed to join open path task: {error}"))?
}

#[tauri::command]
pub async fn open_external_url(url: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || run_open_target(&url, OpenTargetKind::Url))
        .await
        .map_err(|error| format!("failed to join open URL task: {error}"))?
}

fn run_invoke_bridge(app: AppHandle, request_json: String) -> Result<String, String> {
    let invocation = resolve_bridge_shell_invocation(&app)?;
    let command = invocation.command.clone();

    let mut child = Command::new(&command)
        .args(&invocation.args)
        .env("SKILL_FLOW_CALLER", "desktop-bridge")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            format!(
                "failed to start bridge helper command '{}': {error}",
                command
            )
        })?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(request_json.as_bytes())
            .map_err(|error| format!("failed to write bridge request to stdin: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("failed to wait for bridge helper to exit: {error}"))?;

    if output.status.success() {
        let stdout = String::from_utf8(output.stdout)
            .map_err(|error| format!("bridge helper returned non-UTF-8 stdout: {error}"))?;
        let trimmed = stdout.trim();
        if trimmed.is_empty() {
            return Err("bridge helper returned empty stdout".to_owned());
        }

        return Ok(trimmed.to_owned());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    if stderr.is_empty() {
        Err(format!("bridge helper exited with status {}", output.status))
    } else {
        Err(format!(
            "bridge helper exited with status {}: {}",
            output.status, stderr
        ))
    }
}

fn run_clear_metadata_cache(app: AppHandle) -> Result<(), String> {
    let state_root = resolve_state_root(&app)?;
    let catalog_root = state_root.join("catalog");
    let targets = [
        catalog_root.join("import-data.json"),
        catalog_root.join("source-metadata.json"),
    ];

    for target in targets {
        match std::fs::remove_file(&target) {
            Ok(()) => {}
            Err(error) if error.kind() == ErrorKind::NotFound => {}
            Err(error) => {
                return Err(format!(
                    "failed to remove metadata cache file '{}': {error}",
                    target.display()
                ))
            }
        }
    }

    Ok(())
}

enum OpenTargetKind {
    Path,
    Url,
}

fn run_open_target(target: &str, kind: OpenTargetKind) -> Result<(), String> {
    let trimmed = target.trim();
    if trimmed.is_empty() {
        return Ok(());
    }

    let status = open_command(trimmed, kind)
        .status()
        .map_err(|error| format!("failed to start opener for '{}': {error}", trimmed))?;
    if status.success() {
        return Ok(());
    }
    Err(format!("opener for '{}' exited with status {}", trimmed, status))
}

#[cfg(target_os = "macos")]
fn open_command(target: &str, _kind: OpenTargetKind) -> Command {
    let mut command = Command::new("open");
    command.arg(target);
    command
}

#[cfg(target_os = "windows")]
fn open_command(target: &str, kind: OpenTargetKind) -> Command {
    match kind {
        OpenTargetKind::Path => {
            let mut command = Command::new("explorer");
            command.arg(target);
            command
        }
        OpenTargetKind::Url => {
            let mut command = Command::new("cmd");
            command.args(["/C", "start", "", target]);
            command
        }
    }
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn open_command(target: &str, _kind: OpenTargetKind) -> Command {
    let mut command = Command::new("xdg-open");
    command.arg(target);
    command
}

fn resolve_state_root(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(explicit_root) = std::env::var_os("SKILL_FLOW_STATE_ROOT") {
        return Ok(PathBuf::from(explicit_root));
    }

    let home_dir = app
        .path()
        .home_dir()
        .map_err(|error| format!("failed to resolve desktop home directory: {error}"))?;
    Ok(home_dir.join(".skillflow"))
}
