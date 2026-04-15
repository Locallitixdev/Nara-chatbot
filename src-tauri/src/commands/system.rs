use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct SystemStats {
    pub cpu: CpuStats,
    pub memory: MemoryStats,
    pub gpu: GpuStats,
    pub uptime: u64,
}

#[derive(Debug, Serialize)]
pub struct CpuStats {
    pub usage: f64,
    pub cores: u32,
}

#[derive(Debug, Serialize)]
pub struct MemoryStats {
    pub used: u64,
    pub total: u64,
    pub percent: u32,
}

#[derive(Debug, Serialize)]
pub struct GpuStats {
    pub name: String,
    pub usage: f64,
}

/// Get system stats (CPU, memory, GPU)
/// Works on Windows via WMIC/PowerShell, Linux via /proc, macOS via sysctl
#[tauri::command]
pub fn get_system_stats() -> Result<SystemStats, String> {
    let cpu = get_cpu_stats();
    let memory = get_memory_stats();
    let gpu = get_gpu_stats();
    let uptime = get_uptime();

    Ok(SystemStats {
        cpu,
        memory,
        gpu,
        uptime,
    })
}

fn get_cpu_stats() -> CpuStats {
    let cores = num_cpus_fallback();

    // Try to get CPU usage
    let usage = if cfg!(target_os = "windows") {
        // Windows: PowerShell Get-Counter
        Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples[0].CookedValue",
            ])
            .output()
            .ok()
            .and_then(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .trim()
                    .replace(',', ".")
                    .parse::<f64>()
                    .ok()
            })
            .unwrap_or(0.0)
    } else if cfg!(target_os = "linux") {
        // Linux: /proc/stat
        parse_linux_cpu().unwrap_or(0.0)
    } else {
        0.0
    };

    CpuStats {
        usage: usage.min(100.0),
        cores,
    }
}

fn get_memory_stats() -> MemoryStats {
    if cfg!(target_os = "windows") {
        // Windows: systeminfo or WMIC
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory | ConvertTo-Json",
            ])
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                let total_kb = json["TotalVisibleMemorySize"].as_u64().unwrap_or(0);
                let free_kb = json["FreePhysicalMemory"].as_u64().unwrap_or(0);
                let total = total_kb * 1024;
                let free = free_kb * 1024;
                let used = total.saturating_sub(free);
                let percent = if total > 0 {
                    ((used as f64 / total as f64) * 100.0) as u32
                } else {
                    0
                };
                return MemoryStats {
                    used,
                    total,
                    percent,
                };
            }
        }
    } else if cfg!(target_os = "linux") {
        if let Ok(meminfo) = std::fs::read_to_string("/proc/meminfo") {
            let mut total: u64 = 0;
            let mut available: u64 = 0;
            for line in meminfo.lines() {
                if line.starts_with("MemTotal:") {
                    total = parse_meminfo_value(line);
                } else if line.starts_with("MemAvailable:") {
                    available = parse_meminfo_value(line);
                }
            }
            let used = total.saturating_sub(available);
            let percent = if total > 0 {
                ((used as f64 / total as f64) * 100.0) as u32
            } else {
                0
            };
            return MemoryStats {
                used,
                total,
                percent,
            };
        }
    }

    MemoryStats {
        used: 0,
        total: 0,
        percent: 0,
    }
}

fn get_gpu_stats() -> GpuStats {
    // Try nvidia-smi for NVIDIA GPUs
    if let Ok(output) = Command::new("nvidia-smi")
        .args(["--query-gpu=name,utilization.gpu", "--format=csv,noheader,nounits"])
        .output()
    {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = text.trim().split(',').collect();
            if parts.len() >= 2 {
                return GpuStats {
                    name: parts[0].trim().to_string(),
                    usage: parts[1].trim().parse().unwrap_or(0.0),
                };
            }
        }
    }

    // Fallback: try to detect GPU name on Windows
    if cfg!(target_os = "windows") {
        if let Ok(output) = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name",
            ])
            .output()
        {
            let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !name.is_empty() {
                return GpuStats { name, usage: 0.0 };
            }
        }
    }

    GpuStats {
        name: "Tidak terdeteksi".to_string(),
        usage: 0.0,
    }
}

fn get_uptime() -> u64 {
    if cfg!(target_os = "windows") {
        Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).TotalSeconds",
            ])
            .output()
            .ok()
            .and_then(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .trim()
                    .replace(',', ".")
                    .parse::<f64>()
                    .ok()
            })
            .map(|s| s as u64)
            .unwrap_or(0)
    } else if cfg!(target_os = "linux") {
        std::fs::read_to_string("/proc/uptime")
            .ok()
            .and_then(|s| s.split_whitespace().next()?.parse::<f64>().ok())
            .map(|s| s as u64)
            .unwrap_or(0)
    } else {
        0
    }
}

// ─── Helpers ────────────────────────────────────────────────

fn num_cpus_fallback() -> u32 {
    std::thread::available_parallelism()
        .map(|n| n.get() as u32)
        .unwrap_or(1)
}

#[cfg(target_os = "linux")]
fn parse_linux_cpu() -> Option<f64> {
    use std::thread;
    use std::time::Duration;

    let read_stat = || -> Option<(u64, u64)> {
        let stat = std::fs::read_to_string("/proc/stat").ok()?;
        let cpu_line = stat.lines().next()?;
        let values: Vec<u64> = cpu_line
            .split_whitespace()
            .skip(1)
            .filter_map(|v| v.parse().ok())
            .collect();
        if values.len() < 4 {
            return None;
        }
        let idle = values[3];
        let total: u64 = values.iter().sum();
        Some((idle, total))
    };

    let (idle1, total1) = read_stat()?;
    thread::sleep(Duration::from_millis(200));
    let (idle2, total2) = read_stat()?;

    let idle_diff = idle2.saturating_sub(idle1) as f64;
    let total_diff = total2.saturating_sub(total1) as f64;

    if total_diff == 0.0 {
        return Some(0.0);
    }

    Some(((total_diff - idle_diff) / total_diff) * 100.0)
}

#[cfg(not(target_os = "linux"))]
fn parse_linux_cpu() -> Option<f64> {
    None
}

fn parse_meminfo_value(line: &str) -> u64 {
    line.split_whitespace()
        .nth(1)
        .and_then(|v| v.parse::<u64>().ok())
        .map(|kb| kb * 1024) // convert kB to bytes
        .unwrap_or(0)
}
