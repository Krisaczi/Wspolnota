import { invoke } from '../db/tauriBridge';

export async function downloadBackup(): Promise<void> {
  await invoke('create_manual_backup');
}

export async function pickRestoreFile(): Promise<string | null> {
  const { pickOpenFile } = await import('../db/tauriBridge');
  const chosen = await pickOpenFile('sqlite', 'SQLite database');
  return chosen.canceled ? null : chosen.path;
}

export async function restoreFromBackup(path: string): Promise<void> {
  await invoke('restore_backup_command', { path });
}

export async function importDatabaseFile(path: string): Promise<void> {
  await invoke('import_database_file', { sourcePath: path });
}

export async function resetAllData(): Promise<void> {
  await invoke('reset_database');
}
