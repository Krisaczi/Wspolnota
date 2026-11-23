import type { Apartment } from '../../domain/types';
import { execute, queryRows, lastInsertId, type Row } from '../client';

export interface ApartmentInput {
  apartmentNumber: string;
  ownerId: number | null;
  areaM2: number;
  residentsCount: number;
  shareRatio: number;
  active: boolean;
  startingBalance: number;
}

export interface ApartmentRecord extends Apartment {
  ownerName: string | null;
}

function mapApartment(row: Row): ApartmentRecord {
  return {
    id: Number(row.id),
    apartmentNumber: String(row.apartment_number),
    ownerId: row.owner_id === null ? null : Number(row.owner_id),
    ownerName: row.owner_name === null || row.owner_name === undefined ? null : String(row.owner_name),
    areaM2: Number(row.area_m2),
    residentsCount: Number(row.residents_count),
    shareRatio: Number(row.share_ratio),
    startingBalance: Number(row.starting_balance ?? 0),
    active: Number(row.active) === 1,
  };
}

export function listApartments(): ApartmentRecord[] {
  return queryRows(
    `SELECT a.*, o.full_name AS owner_name
       FROM apartments a
       LEFT JOIN owners o ON o.id = a.owner_id
      ORDER BY a.apartment_number COLLATE NOCASE`,
  ).map(mapApartment);
}

export function findApartment(id: number): ApartmentRecord | null {
  const row = queryRows(
    `SELECT a.*, o.full_name AS owner_name
       FROM apartments a
       LEFT JOIN owners o ON o.id = a.owner_id
      WHERE a.id = ?`,
    [id],
  )[0];
  return row ? mapApartment(row) : null;
}

export function insertApartment(input: ApartmentInput): number {
  execute(
    `INSERT INTO apartments (apartment_number, owner_id, area_m2, residents_count, share_ratio, active, starting_balance)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [input.apartmentNumber, input.ownerId, input.areaM2, input.residentsCount, input.shareRatio, input.active ? 1 : 0, input.startingBalance],
  );
  return lastInsertId();
}

export function updateApartment(id: number, input: ApartmentInput): void {
  execute(
    `UPDATE apartments
        SET apartment_number = ?, owner_id = ?, area_m2 = ?, residents_count = ?, share_ratio = ?, active = ?, starting_balance = ?
      WHERE id = ?`,
    [
      input.apartmentNumber,
      input.ownerId,
      input.areaM2,
      input.residentsCount,
      input.shareRatio,
      input.active ? 1 : 0,
      input.startingBalance,
      id,
    ],
  );
}

export function setApartmentOwner(id: number, ownerId: number): void {
  execute('UPDATE apartments SET owner_id = ? WHERE id = ?', [ownerId, id]);
}

export function deleteApartment(id: number): void {
  execute('DELETE FROM apartments WHERE id = ?', [id]);
}
