use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct OpenClawStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub port: u16,
    pub error: Option<String>,
}

/// Check if OpenClaw is running
#[tauri::command]
pub fn check_openclaw_status() -> OpenClawStatus {
    // Try to connect to OpenClaw API
    let port: u16 = 7654;

    // Check if port 7654 is in use (OpenClaw default)
    let listening = if cfg!(target_os = "windows") {
        Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                &format!("Get-NetTCPConnection -LocalPort {} -ErrorAction SilentlyContinue | Select-Object -First 1 OwningProcess | ConvertTo-Json", port),
            ])
            .output()
            .ok()
            .map(|o| {
                let text = String::from_utf8_lossy(&o.stdout);
                !text.trim().is_empty() && text.contains("OwningProcess")
            })
            .unwrap_or(false)
    } else {
        Command::new("lsof")
            .args(["-i", &format!(":{}", port)])
            .output()
            .ok()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    if listening {
        // Try to get PID
        let pid = get_openclaw_pid(port);
        OpenClawStatus {
            running: true,
            pid,
            port,
            error: None,
        }
    } else {
        OpenClawStatus {
            running: false,
            pid: None,
            port,
            error: None,
        }
    }
}

/// Start OpenClaw process
#[tauri::command]
pub async fn start_openclaw_process() -> Result<OpenClawStatus, String> {
    // Try to start openclaw
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", "/B", "openclaw", "serve"])
            .spawn()
    } else {
        Command::new("openclaw")
            .arg("serve")
            .spawn()
    };

    match result {
        Ok(child) => {
            let pid = child.id();
            // Wait a moment for startup
            std::thread::sleep(std::time::Duration::from_secs(2));
            Ok(OpenClawStatus {
                running: true,
                pid: Some(pid),
                port: 7654,
                error: None,
            })
        }
        Err(e) => Err(format!(
            "Gagal menjalankan OpenClaw: {}. Pastikan openclaw sudah terinstall.",
            e
        )),
    }
}

/// Stop OpenClaw process
#[tauri::command]
pub async fn stop_openclaw_process() -> Result<(), String> {
    if cfg!(target_os = "windows") {
        Command::new("taskkill")
            .args(["/IM", "openclaw.exe", "/F"])
            .output()
            .map_err(|e| format!("Gagal menghentikan OpenClaw: {}", e))?;
    } else {
        Command::new("pkill")
            .arg("openclaw")
            .output()
            .map_err(|e| format!("Gagal menghentikan OpenClaw: {}", e))?;
    }
    Ok(())
}

fn get_openclaw_pid(port: u16) -> Option<u32> {
    if cfg!(target_os = "windows") {
        Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                &format!(
                    "(Get-NetTCPConnection -LocalPort {} -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess",
                    port
                ),
            ])
            .output()
            .ok()
            .and_then(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .trim()
                    .parse::<u32>()
                    .ok()
            })
    } else {
        Command::new("lsof")
            .args(["-t", "-i", &format!(":{}", port)])
            .output()
            .ok()
            .and_then(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .trim()
                    .lines()
                    .next()?
                    .parse::<u32>()
                    .ok()
            })
    }
}
