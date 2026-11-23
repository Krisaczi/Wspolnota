use crate::backup::{self, BackupEntry};
use crate::db_state::{backup_dir, db_path, DbState};
use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Opens the database file briefly (used by setup and integrity checks).
pub fn open_conn(path: &PathBuf) -> Connection {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).expect("failed to create app data directory");
    }
    let conn = Connection::open(path).expect("failed to open SQLite database");
    conn.pragma_update(None, "foreign_keys", "ON").ok();
    conn
}

#[tauri::command]
pub fn load_database_bytes(app: AppHandle) -> Result<Vec<u8>, String> {
    
    let path = db_path(&app);
    println!("LOAD FROM: {:?}", path);
    if !path.exists() {
        return Ok(Vec::new());
    }
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_database_bytes(app: AppHandle, bytes: Vec<u8>) -> Result<(), String> {
    let path = db_path(&app);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    println!("SAVE TO: {:?}", path);
    println!("SIZE: {}", bytes.len());

    std::fs::write(&path, &bytes)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn create_manual_backup(app: AppHandle) -> Result<BackupEntry, String> {
    let path = backup::create_backup(&app, "manual")?;
    let meta = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    Ok(BackupEntry {
        name: path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default(),
        path: path.to_string_lossy().to_string(),
        size_bytes: meta,
        modified_at: chrono::Local::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn list_backups_command(app: AppHandle) -> Vec<BackupEntry> {
    backup::list_backups(&app)
}

#[tauri::command]
pub fn restore_backup_command(app: AppHandle, path: String) -> Result<(), String> {
    backup::restore_backup(&app, &path)?;
    let _ = app.restart();
    Ok(())
}

#[tauri::command]
pub fn delete_backup_command(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_database_path(app: AppHandle) -> String {
    db_path(&app).to_string_lossy().to_string()
}

#[tauri::command]
pub fn get_backup_dir(app: AppHandle) -> String {
    backup_dir(&app).to_string_lossy().to_string()
}

#[tauri::command]
pub fn reveal_in_shell(app: AppHandle, path: String) -> Result<(), String> {
    let folder = PathBuf::from(path);
    let parent = folder
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| folder.clone());
    tauri_plugin_opener::open_path(parent.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}

/// Runs pending schema migrations on the live database connection.
#[tauri::command]
pub fn run_migrations(app: AppHandle) -> Result<usize, String> {
    let state = app.state::<DbState>();
    state.with_conn(|conn| {
        crate::migrations::run_migrations(conn).map_err(|e| e.to_string())
    })
}

/// Replaces the live database with the chosen file, backing up the current
/// state first, then restarts the app so the new data is loaded.
#[tauri::command]
pub fn import_database_file(app: AppHandle, source_path: String) -> Result<(), String> {
    let src = PathBuf::from(&source_path);
    if !src.exists() {
        return Err(format!("File not found: {source_path}"));
    }
    let live = db_path(&app);
    if live.exists() {
        backup::create_backup(&app, "pre-import")?;
        std::fs::remove_file(&live).map_err(|e| e.to_string())?;
    }
    std::fs::copy(&src, &live).map_err(|e| e.to_string())?;
    let _ = app.restart();
    Ok(())
}

/// Erases all application data while keeping the schema intact. Runs the
/// same migration set on the fresh file so the app can start over.
#[tauri::command]
pub fn reset_database(app: AppHandle) -> Result<(), String> {
    let path = db_path(&app);
    backup::create_backup(&app, "pre-reset")?;
    std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    std::fs::write(&path, Vec::<u8>::new()).map_err(|e| e.to_string())?;
    let conn = open_conn(&path);
    crate::migrations::run_migrations(&conn).map_err(|e| e.to_string())?;
    Ok(())
}
