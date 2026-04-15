use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct WhisperResult {
    pub text: String,
    pub language: String,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize)]
pub struct WhisperStatus {
    pub available: bool,
    pub binary_path: Option<String>,
    pub model_path: Option<String>,
}

/// Check if whisper.cpp is available on this system
#[tauri::command]
pub fn check_whisper_status() -> WhisperStatus {
    let binary = find_whisper_binary();
    let model = find_whisper_model();

    WhisperStatus {
        available: binary.is_some() && model.is_some(),
        binary_path: binary.map(|p| p.to_string_lossy().to_string()),
        model_path: model.map(|p| p.to_string_lossy().to_string()),
    }
}

/// Transcribe audio bytes (received from frontend Web Audio API)
/// Saves to temp file, converts to WAV via ffmpeg, then runs whisper.cpp
#[tauri::command]
pub async fn transcribe_audio_bytes(
    audio_bytes: Vec<u8>,
    language: Option<String>,
) -> Result<WhisperResult, String> {
    let start = std::time::Instant::now();
    let lang = language.unwrap_or_else(|| "id".to_string());

    // Save incoming audio bytes to temp file
    let temp_dir = std::env::temp_dir();
    let webm_path = temp_dir.join("nara_recording.webm");
    let wav_path = temp_dir.join("nara_recording.wav");

    std::fs::write(&webm_path, &audio_bytes)
        .map_err(|e| format!("Gagal menyimpan audio: {}", e))?;

    // Convert webm to wav (16kHz mono) using ffmpeg
    let ffmpeg_status = Command::new("ffmpeg")
        .args([
            "-y",                           // overwrite
            "-i", &webm_path.to_string_lossy(),
            "-ar", "16000",                 // 16kHz sample rate (whisper requirement)
            "-ac", "1",                     // mono
            "-acodec", "pcm_s16le",         // 16-bit PCM
            &wav_path.to_string_lossy().to_string(),
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map_err(|e| format!("ffmpeg tidak ditemukan: {}. Install ffmpeg terlebih dahulu.", e))?;

    if !ffmpeg_status.success() {
        return Err("ffmpeg gagal mengkonversi audio".to_string());
    }

    // Run whisper.cpp
    transcribe_file(wav_path.to_string_lossy().to_string(), None, Some(lang), start).await
}

/// Transcribe an audio file using whisper.cpp
#[tauri::command]
pub async fn transcribe_audio(
    audio_path: String,
    model: Option<String>,
    language: Option<String>,
) -> Result<WhisperResult, String> {
    let start = std::time::Instant::now();
    let lang = language.unwrap_or_else(|| "id".to_string());
    transcribe_file(audio_path, model, Some(lang), start).await
}

/// Internal: run whisper.cpp on a file
async fn transcribe_file(
    audio_path: String,
    model: Option<String>,
    language: Option<String>,
    start: std::time::Instant,
) -> Result<WhisperResult, String> {
    let whisper_bin = find_whisper_binary()
        .ok_or_else(|| "whisper.cpp binary tidak ditemukan. Install whisper.cpp terlebih dahulu.".to_string())?;

    let model_path = model
        .map(PathBuf::from)
        .or_else(find_whisper_model)
        .ok_or_else(|| "Model whisper tidak ditemukan. Download model terlebih dahulu.".to_string())?;

    let lang = language.unwrap_or_else(|| "id".to_string());

    let output = Command::new(&whisper_bin)
        .args([
            "-m", &model_path.to_string_lossy(),
            "-f", &audio_path,
            "-l", &lang,
            "--output-txt",
            "--no-timestamps",
            "-t", "4",
        ])
        .output()
        .map_err(|e| format!("Gagal menjalankan whisper: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Whisper error: {}", err));
    }

    let text = String::from_utf8_lossy(&output.stdout)
        .trim()
        .to_string();

    Ok(WhisperResult {
        text,
        language: lang,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

/// Find whisper.cpp binary in common locations
fn find_whisper_binary() -> Option<PathBuf> {
    let candidates = vec![
        // Windows
        PathBuf::from("whisper.exe"),
        PathBuf::from("whisper-cpp.exe"),
        // Relative to exe
        std::env::current_exe().ok()?.parent()?.join("whisper.exe"),
        std::env::current_exe().ok()?.parent()?.join("whisper"),
        // Common install paths
        PathBuf::from(r"C:\whisper.cpp\build\bin\Release\main.exe"),
        PathBuf::from(r"C:\whisper.cpp\main.exe"),
        // Development path
        PathBuf::from("./whisper.cpp/main.exe"),
        PathBuf::from("./whisper.cpp/build/bin/Release/main.exe"),
        // Linux/macOS
        PathBuf::from("/usr/local/bin/whisper"),
        PathBuf::from("./whisper.cpp/main"),
    ];

    // Also check PATH
    if let Ok(output) = Command::new("where").arg("whisper").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(PathBuf::from(path.lines().next().unwrap_or(&path)));
            }
        }
    }

    candidates.into_iter().find(|p| p.exists())
}

/// Find whisper model in common locations
fn find_whisper_model() -> Option<PathBuf> {
    let candidates = vec![
        // Relative to exe (bundled)
        std::env::current_exe().ok()?.parent()?.join("models").join("ggml-medium-id.bin"),
        std::env::current_exe().ok()?.parent()?.join("models").join("ggml-base.bin"),
        std::env::current_exe().ok()?.parent()?.join("models").join("ggml-small.bin"),
        // Common development paths
        PathBuf::from("./whisper.cpp/models/ggml-medium-id.bin"),
        PathBuf::from("./whisper.cpp/models/ggml-base.bin"),
        PathBuf::from("./whisper.cpp/models/ggml-small.bin"),
        // Windows common
        PathBuf::from(r"C:\whisper.cpp\models\ggml-medium-id.bin"),
        PathBuf::from(r"C:\whisper.cpp\models\ggml-base.bin"),
    ];

    candidates.into_iter().find(|p| p.exists())
}
