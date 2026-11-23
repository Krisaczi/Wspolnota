// Frontend bridge to the Tauri (Rust) backend.
// Falls back to a clear error when running outside the desktop shell.

export interface SqlRequest {
  sql: string;
  params: unknown[];
}

export interface SavedFile {
  path: string;
  canceled: boolean;
}

type InvokeFn = (cmd: string, payload?: unknown) => Promise<unknown>;

let invokeFn: InvokeFn | null = null;

function getInvoke(): InvokeFn {
  if (invokeFn) return invokeFn;
  const w = window as typeof window & {
    __TAURI_INTERNALS__?: { invoke: InvokeFn };
    __TAURI__?: { core?: { invoke: InvokeFn } };
  };
  const invoke = w.__TAURI_INTERNALS__?.invoke ?? w.__TAURI__?.core?.invoke;
  if (!invoke) {
    throw new Error(
      'This action requires the desktop application. Please run the app through the Tauri shell.',
    );
  }
  invokeFn = invoke;
  return invokeFn;
}

export function isDesktop(): boolean {
  const w = window as typeof window & {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  };
  return Boolean(w.__TAURI_INTERNALS__ ?? w.__TAURI__);
}

export async function invoke<T>(cmd: string, payload?: unknown): Promise<T> {
  return getInvoke()(cmd, payload) as Promise<T>;
}

export async function nativeQuery(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  return invoke<Record<string, unknown>[]>('db_query', { request: { sql, params } });
}

export async function nativeExecute(sql: string, params: unknown[] = []): Promise<number> {
  return invoke<number>('db_execute', { request: { sql, params } });
}

export async function nativeLastInsertId(): Promise<number> {
  return invoke<number>('db_last_insert_id');
}

export async function saveReportBytes(
  defaultName: string,
  extension: string,
  filterName: string,
  bytes: Uint8Array,
): Promise<SavedFile> {
  return invoke<SavedFile>('save_report_bytes', {
    defaultName,
    extension,
    filterName,
    bytes: Array.from(bytes),
  });
}

export async function pickOpenFile(extension: string, filterName: string): Promise<SavedFile> {
  return invoke<SavedFile>('pick_open_file', { extension, filterName });
}
