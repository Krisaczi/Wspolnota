// Prevents an extra console window on Windows in release builds.
#[cfg_attr(mobile, tauri::mobile_entry_point)]

mod backup;
mod commands;
mod db_state;
mod dialogs;
mod migrations;
use tauri::Manager;

use db_state::{db_path, DbState};
use std::sync::{Arc, Mutex};
use std::fs::File;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let path = db_path(&handle);

            // Fresh install: create an empty file so SQLite can open it.
            if !path.exists() {
                File::create(&path).map_err(|e| e.to_string())?;
            }
            let conn = commands::open_conn(&path);
            migrations::run_migrations(&conn).map_err(|e| e.to_string())?;

            // Automatic backup after migrations on a non-empty database.
            let table_count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table'",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);
            drop(conn);
            if table_count > 0 {
                if let Err(err) = backup::create_backup(&handle, "auto") {
                    eprintln!("automatic backup failed: {err}");
                }
                backup::prune_backups(&handle);
            }

            app.manage(DbState {
                conn: Arc::new(Mutex::new(commands::open_conn(&path))),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            
            commands::create_manual_backup,
            commands::list_backups_command,
            commands::restore_backup_command,
            commands::delete_backup_command,
            commands::get_database_path,
            commands::get_backup_dir,
            commands::reveal_in_shell,
            commands::import_database_file,
            commands::reset_database,
            dialogs::save_report_bytes,
            dialogs::pick_open_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running housing community manager");
}
