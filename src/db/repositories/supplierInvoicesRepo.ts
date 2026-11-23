import type { SupplierInvoice, SupplierInvoiceInput } from '../../domain/accounting/types';
import { execute, lastInsertId, queryRows, type Row } from '../client';

function mapInvoice(row: Row): SupplierInvoice {
  return {
    id: Number(row.id),
    invoiceDate: String(row.invoice_date),
    supplierName: String(row.supplier_name),
    description: row.description === null ? null : String(row.description),
    amount: Number(row.amount),
    expenseAccountId: Number(row.expense_account_id),
    expenseAccountCode: String(row.code),
    expenseAccountName: String(row.name),
    paid: Number(row.paid) === 1,
    paidDate: row.paid_date === null ? null : String(row.paid_date),
  };
}

const SELECT = `
  SELECT si.*, a.code, a.name
    FROM supplier_invoices si
    JOIN accounts a ON a.id = si.expense_account_id`;

export function listSupplierInvoices(): SupplierInvoice[] {
  return queryRows(`${SELECT} ORDER BY si.invoice_date DESC, si.id DESC`).map(mapInvoice);
}

export function findSupplierInvoice(id: number): SupplierInvoice | null {
  const rows = queryRows(`${SELECT} WHERE si.id = ?`, [id]);
  return rows.length === 0 ? null : mapInvoice(rows[0]);
}

export function insertSupplierInvoice(input: SupplierInvoiceInput): number {
  execute('INSERT INTO supplier_invoices (invoice_date, supplier_name, description, amount, expense_account_id) VALUES (?, ?, ?, ?, ?)', [
    input.invoiceDate,
    input.supplierName,
    input.description,
    input.amount,
    input.expenseAccountId,
  ]);
  return lastInsertId();
}

export function updateSupplierInvoice(id: number, input: SupplierInvoiceInput): void {
  execute('UPDATE supplier_invoices SET invoice_date = ?, supplier_name = ?, description = ?, amount = ?, expense_account_id = ? WHERE id = ?', [
    input.invoiceDate,
    input.supplierName,
    input.description,
    input.amount,
    input.expenseAccountId,
    id,
  ]);
}

export function markInvoicePaid(id: number, paidDate: string | null): void {
  execute('UPDATE supplier_invoices SET paid = ?, paid_date = ? WHERE id = ?', [paidDate === null ? 0 : 1, paidDate, id]);
}

export function deleteSupplierInvoice(id: number): void {
  execute('DELETE FROM supplier_invoices WHERE id = ?', [id]);
}

/** Open (unpaid) supplier payables per supplier name, in whole cents of the currency. */
export function supplierBalances(): { supplierName: string; balance: number }[] {
  const rows = queryRows(
    'SELECT supplier_name, SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) AS balance FROM supplier_invoices GROUP BY supplier_name ORDER BY supplier_name',
  );
  return rows.map((row) => ({ supplierName: String(row.supplier_name), balance: Number(row.balance) }));
}
