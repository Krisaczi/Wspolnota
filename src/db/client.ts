import initSqlJs, { type Database, type SqlValue } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { loadDatabaseBytes, saveDatabaseBytes } from "./persistence";
import { runMigrations } from "./migrations";

export type Row = Record<string, SqlValue>;
export type SqlParam = SqlValue;

const SAVE_DEBOUNCE_MS = 400;

let database: Database | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saveChain: Promise<void> = Promise.resolve();

function requireDatabase(): Database {
  if (!database) throw new Error("Database has not been opened yet");
  return database;
}

async function persistNow(): Promise<void> {
  console.log("PERSIST DATABASE");

  const count = queryRows("SELECT COUNT(*) AS cnt FROM owners");

  console.log("OWNERS BEFORE SAVE:", count);

  const bytes = requireDatabase().export();

  console.log("DATABASE SIZE:", bytes.length);

  saveChain = saveChain.then(() => saveDatabaseBytes(bytes));

  await saveChain;
}

function scheduleSave(): void {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    void persistNow();
  }, SAVE_DEBOUNCE_MS);
}

export async function openDatabase(): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const stored = await loadDatabaseBytes();
  database = stored ? new SQL.Database(stored) : new SQL.Database();
  database.exec("PRAGMA foreign_keys = ON");
  if (runMigrations(database) || !stored) {
    await persistNow();
  }
}

export async function flushPendingSave(): Promise<void> {
  if (saveTimer === undefined) return;
  clearTimeout(saveTimer);
  saveTimer = undefined;
  await persistNow();
}

export function discardPendingSave(): void {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
  }
}

export function queryRows(sql: string, params: SqlParam[] = []): Row[] {
  const statement = requireDatabase().prepare(sql);
  try {
    statement.bind(params);
    const rows: Row[] = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

export function execute(sql: string, params: SqlParam[] = []): number {
  console.log("EXECUTE:", sql, params);

  const db = requireDatabase();
  db.run(sql, params);

  console.log("OWNERS:", queryRows("SELECT COUNT(*) as cnt FROM owners"));

  scheduleSave();

  return db.getRowsModified();
}

export function lastInsertId(): number {
  return Number(queryRows("SELECT last_insert_rowid() AS id")[0].id);
}

let transactionDepth = 0;

export function withTransaction<T>(operation: () => T): T {
  const db = requireDatabase();
  const isOutermost = transactionDepth === 0;
  const savepoint = `sp_${transactionDepth}`;
  db.exec(isOutermost ? "BEGIN TRANSACTION" : `SAVEPOINT ${savepoint}`);
  transactionDepth += 1;
  try {
    const result = operation();
    transactionDepth -= 1;
    db.exec(isOutermost ? "COMMIT" : `RELEASE ${savepoint}`);
    if (isOutermost) scheduleSave();
    return result;
  } catch (error) {
    transactionDepth -= 1;
    db.exec(
      isOutermost
        ? "ROLLBACK"
        : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`,
    );
    throw error;
  }
}

export async function replaceDatabase(): Promise<void> {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  database?.close();
  database = new SQL.Database();
  database.exec("PRAGMA foreign_keys = ON");
  runMigrations(database);
  await persistNow();
}

export function exportDatabaseBytes(): Uint8Array {
  return requireDatabase().export();
}
