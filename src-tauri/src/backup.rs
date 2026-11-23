use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

use crate::db_state::{backup_dir, db_path};

const MAX_BACKUPS: usize = 14;

fn now_stamp() -> String {
    chrono::Local::now().format("%Y%m%d-%H%M%S").to_string()
}

#[derive(Serialize, Clone)]
pub struct BackupEntry {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub modified_at: String,
}

/// Copies the live database file into the backup folder. The database is
/// written by the frontend as a single complete SQLite file, so a plain
/// copy is always consistent.
pub fn create_backup(app: &AppHandle, label: &str) -> Result<PathBuf, String> {
    let dir = backup_dir(app);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let src = db_path(app);
    if !src.exists() {
        return Err("Database file does not exist yet".to_string());
    }
    let dest = dir.join(format!(
        "housing-community-{}-{}.sqlite",
        label,
        now_stamp()
    ));
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(dest)
}

pub fn list_backups(app: &AppHandle) -> Vec<BackupEntry> {
    let dir = backup_dir(app);
    let mut entries: Vec<BackupEntry> = Vec::new();
    if let Ok(read) = fs::read_dir(&dir) {
        for entry in read.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("sqlite") {
                let meta = entry.metadata().ok();
                entries.push(BackupEntry {
                    name: path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    path: path.to_string_lossy().to_string(),
                    size_bytes: meta.as_ref().map(|m| m.len()).unwrap_or(0),
                    modified_at: meta
                        .and_then(|m| m.modified().ok())
                        .map(|t| chrono::DateTime::<chrono::Local>::from(t).to_rfc3339())
                        .unwrap_or_default(),
                });
            }
        }
    }
    entries.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    entries
}

/// Copies a backup over the live database file, first backing up the
/// current state so the restore itself can be undone.
pub fn restore_backup(app: &AppHandle, backup_path: &str) -> Result<(), String> {
    let src = PathBuf::from(backup_path);
    if !src.exists() {
        return Err(format!("Backup file not found: {backup_path}"));
    }
    let live = db_path(app);
    if live.exists() {
        create_backup(app, "pre-restore")?;
        fs::remove_file(&live).map_err(|e| e.to_string())?;
    }
    fs::copy(&src, &live).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn prune_backups(app: &AppHandle) {
    let entries = list_backups(app);
    for entry in entries.into_iter().skip(MAX_BACKUPS) {
        let _ = fs::remove_file(entry.path);
    }
}
