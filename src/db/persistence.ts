import { isDesktop, invoke } from './tauriBridge';

export async function loadDatabaseBytes(): Promise<Uint8Array | null> {
  if (!isDesktop()) return null;
  const bytes = await invoke<number[]>('load_database_bytes');
  return bytes.length > 0 ? new Uint8Array(bytes) : null;
}

export async function saveDatabaseBytes(bytes: Uint8Array): Promise<void> {
  if (!isDesktop()) return;
  await invoke('save_database_bytes', { bytes: Array.from(bytes) });
}
