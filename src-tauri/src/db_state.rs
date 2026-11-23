use tauri::Manager;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

pub const DB_FILE_NAME: &str = "housing-community-manager.sqlite";

pub fn app_data_dir(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data directory");

    let _ = std::fs::create_dir_all(&dir);

    dir
}

pub fn db_path(app: &AppHandle) -> PathBuf {
    app_data_dir(app).join(DB_FILE_NAME)
}

pub fn backup_dir(app: &AppHandle) -> PathBuf {
    app_data_dir(app).join("backups")
}

/// Shared managed database handle. rusqlite::Connection is Send but not Sync,
/// so it is wrapped in a Mutex behind an Arc to make the state Send + Sync as
/// required for tauri::app.manage in Tauri v2.
pub struct DbState {
    pub conn: Arc<Mutex<rusqlite::Connection>>,
}

impl DbState {
    pub fn new(conn: rusqlite::Connection) -> Self {
        DbState {
            conn: Arc::new(Mutex::new(conn)),
        }
    }

    /// Runs `f` with exclusive access to the connection.
    pub fn with_conn<T>(
        &self,
        f: impl FnOnce(&mut rusqlite::Connection) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut guard = self
            .conn
            .lock()
            .map_err(|_| "database connection poisoned".to_string())?;
        f(&mut guard)
    }
}
