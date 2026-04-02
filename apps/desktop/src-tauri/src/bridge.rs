use std::io::Write;
use std::process::{Command, Stdio};

use tauri::AppHandle;

use crate::config::resolve_bridge_shell_invocation;

#[tauri::command]
pub async fn invoke_bridge(app: AppHandle, request_json: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || run_invoke_bridge(app, request_json))
        .await
        .map_err(|error| format!("failed to join bridge task: {error}"))?
}

fn run_invoke_bridge(app: AppHandle, request_json: String) -> Result<String, String> {
    let invocation = resolve_bridge_shell_invocation(&app)?;
    let command = invocation.command.clone();

    let mut child = Command::new(&command)
        .args(&invocation.args)
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
