import type { Owner } from "../../domain/types";
import { AppError } from "../../lib/errors";
import { execute, queryRows, lastInsertId, type Row } from "../client";

export interface OwnerInput {
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

function mapOwner(row: Row): Owner {
  return {
    id: Number(row.id),
    fullName: String(row.full_name),
    email: row.email === null ? null : String(row.email),
    phone: row.phone === null ? null : String(row.phone),
    address: row.address === null ? null : String(row.address),
  };
}

export function listOwners(): Owner[] {
  return queryRows(
    "SELECT * FROM owners ORDER BY full_name COLLATE NOCASE",
  ).map(mapOwner);
}

export function insertOwner(input: OwnerInput): number {
  console.log("INSERT OWNER", input);
  execute(
    "INSERT INTO owners (full_name, email, phone, address) VALUES (?, ?, ?, ?)",
    [input.fullName, input.email, input.phone, input.address],
  );
  console.log("OWNER COUNT", listOwners().length);
  return lastInsertId();
}

export function updateOwner(id: number, input: OwnerInput): void {
  execute(
    "UPDATE owners SET full_name = ?, email = ?, phone = ?, address = ? WHERE id = ?",
    [input.fullName, input.email, input.phone, input.address, id],
  );
}

export function deleteOwner(id: number): void {
  const removed = execute(
    `DELETE FROM owners WHERE id = ?
       AND NOT EXISTS (SELECT 1 FROM apartments WHERE owner_id = ?)
       AND NOT EXISTS (SELECT 1 FROM ownership_transfers WHERE from_owner_id = ? OR to_owner_id = ?)`,
    [id, id, id, id],
  );
  if (removed === 0) {
    throw new AppError(
      "This owner still owns apartments or has ownership history. Transfer the apartments first; history is kept for your records.",
    );
  }
}
