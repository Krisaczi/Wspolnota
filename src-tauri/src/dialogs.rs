use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, FilePath};

#[derive(Serialize, Clone)]
pub struct SavedFile {
    pub path: String,
    pub canceled: bool,
}

fn path_to_string(path: FilePath) -> String {
    match path {
        FilePath::Url(url) => url.to_string(),
        FilePath::Path(p) => p.to_string_lossy().to_string(),
    }
}

/// Opens a native save dialog and writes the given bytes to the chosen path.
#[tauri::command]
pub async fn save_report_bytes(
    app: AppHandle,
    default_name: String,
    extension: String,
    filter_name: String,
    bytes: Vec<u8>,
) -> Result<SavedFile, String> {
    let ext = extension.trim_start_matches('.').to_string();

    // Blocking dialog variants must not run on the main thread, so park the
    // call on a dedicated blocking worker thread.
    let chosen = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_file_name(&default_name)
            .add_filter(&filter_name, &[ext.as_str()])
            .blocking_save_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    let Some(path) = chosen else {
        return Ok(SavedFile {
            path: String::new(),
            canceled: true,
        });
    };
    let target = path_to_string(path);
    std::fs::write(&target, bytes).map_err(|e| e.to_string())?;
    Ok(SavedFile {
        path: target,
        canceled: false,
    })
}

/// Opens a native open dialog restricted to a single extension.
#[tauri::command]
pub async fn pick_open_file(
    app: AppHandle,
    extension: String,
    filter_name: String,
) -> Result<SavedFile, String> {
    let ext = extension.trim_start_matches('.').to_string();

    let chosen = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter(&filter_name, &[ext.as_str()])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    match chosen {
        Some(path) => Ok(SavedFile {
            path: path_to_string(path),
            canceled: false,
        }),
        None => Ok(SavedFile {
            path: String::new(),
            canceled: true,
        }),
    }
}
