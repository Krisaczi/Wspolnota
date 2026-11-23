import type { OwnershipTransfer } from '../../domain/types';
import { execute, queryRows, type Row } from '../client';

export interface OwnershipTransferView extends OwnershipTransfer {
  apartmentNumber: string;
  fromOwnerName: string | null;
  toOwnerName: string;
}

function mapTransfer(row: Row): OwnershipTransferView {
  return {
    id: Number(row.id),
    apartmentId: Number(row.apartment_id),
    apartmentNumber: String(row.apartment_number),
    fromOwnerId: row.from_owner_id === null ? null : Number(row.from_owner_id),
    fromOwnerName: row.from_owner_name === null ? null : String(row.from_owner_name),
    toOwnerId: Number(row.to_owner_id),
    toOwnerName: String(row.to_owner_name),
    transferDate: String(row.transfer_date),
    note: row.note === null ? null : String(row.note),
  };
}

const TRANSFER_SELECT = `
  SELECT t.id, t.apartment_id, t.from_owner_id, t.to_owner_id, t.transfer_date, t.note,
         a.apartment_number,
         fo.full_name AS from_owner_name,
         tor.full_name AS to_owner_name
    FROM ownership_transfers t
    JOIN apartments a ON a.id = t.apartment_id
    LEFT JOIN owners fo ON fo.id = t.from_owner_id
    JOIN owners tor ON tor.id = t.to_owner_id`;

export function listTransfersForOwner(ownerId: number): OwnershipTransferView[] {
  return queryRows(
    `${TRANSFER_SELECT}
      WHERE t.from_owner_id = ? OR t.to_owner_id = ?
      ORDER BY t.transfer_date DESC, t.id DESC`,
    [ownerId, ownerId],
  ).map(mapTransfer);
}

export function insertTransfer(input: {
  apartmentId: number;
  fromOwnerId: number | null;
  toOwnerId: number;
  transferDate: string;
  note: string | null;
}): void {
  execute(
    `INSERT INTO ownership_transfers (apartment_id, from_owner_id, to_owner_id, transfer_date, note)
     VALUES (?, ?, ?, ?, ?)`,
    [input.apartmentId, input.fromOwnerId, input.toOwnerId, input.transferDate, input.note],
  );
}
