import type { AuditEntry } from '../../domain/accounting/types';
import { execute, queryRows, type Row } from '../client';

export interface AuditInput {
  action: string;
  entity: string;
  entityId: number | null;
  summary: string;
}

function mapAudit(row: Row): AuditEntry {
  return {
    id: Number(row.id),
    createdAt: String(row.created_at),
    action: String(row.action),
    entity: String(row.entity),
    entityId: row.entity_id === null ? null : Number(row.entity_id),
    summary: String(row.summary),
  };
}

export function insertAuditEntry(input: AuditInput): void {
  execute('INSERT INTO audit_log (action, entity, entity_id, summary) VALUES (?, ?, ?, ?)', [
    input.action,
    input.entity,
    input.entityId,
    input.summary,
  ]);
}

export function listAuditEntries(limit: number): AuditEntry[] {
  return queryRows('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?', [limit]).map(mapAudit);
}
