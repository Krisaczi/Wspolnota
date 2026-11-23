import i18n from '../../i18n';
import { withTransaction } from '../../db/client';
import { findAccountByCode } from '../../db/repositories/accountsRepo';
import type { SupplierInvoiceInput } from '../../domain/accounting/types';
import {
  deleteSupplierInvoice,
  findSupplierInvoice,
  insertSupplierInvoice,
  markInvoicePaid,
  updateSupplierInvoice,
} from '../../db/repositories/supplierInvoicesRepo';
import { ACCOUNT_CODES, type JournalEntrySource } from '../../domain/accounting/types';
import { AppError } from '../../lib/errors';
import { firstError } from '../../domain/validation/common';
import { postJournalEntry, reverseSourceEntries } from './accountingService';

const INVOICE_SOURCE = 'supplier_invoice' as const;
const PAYMENT_SOURCE = 'supplier_payment' as const;

function invoiceSource(id: number): JournalEntrySource {
  return { sourceType: INVOICE_SOURCE, sourceId: id };
}

function paymentSource(id: number): JournalEntrySource {
  return { sourceType: PAYMENT_SOURCE, sourceId: id };
}

function invoiceDescription(invoiceId: number, supplierName: string): string {
  return i18n.t('serviceErrors.supplierInvoiceDescription', { id: invoiceId, supplier: supplierName });
}

function paymentDescription(invoiceId: number, supplierName: string): string {
  return i18n.t('serviceErrors.supplierPaymentDescription', { id: invoiceId, supplier: supplierName });
}

/** Registers a supplier invoice: Dr expense (user-selected 4010-4080) / Cr 2020 Supplier Payables. */
function postInvoiceEntry(invoiceId: number, input: SupplierInvoiceInput): void {
  const payables = findAccountByCode(ACCOUNT_CODES.SUPPLIER_PAYABLES);
  if (!payables) throw new AppError(i18n.t('serviceErrors.supplierInvoiceNotPosted'));

  const result = postJournalEntry(
    {
      entryDate: input.invoiceDate,
      description: invoiceDescription(invoiceId, input.supplierName),
      lines: [
        { accountId: input.expenseAccountId, debitAmount: input.amount, creditAmount: 0 },
        { accountId: payables.id, debitAmount: 0, creditAmount: input.amount },
      ],
    },
    invoiceSource(invoiceId),
  );
  if (!result.ok) throw new AppError(firstError(result.errors));
}

/** Pays a supplier invoice: Dr 2020 Supplier Payables / Cr 1010 Bank Account. */
function postPaymentEntry(invoiceId: number, input: SupplierInvoiceInput, paidDate: string): void {
  const bank = findAccountByCode(ACCOUNT_CODES.BANK);
  const payables = findAccountByCode(ACCOUNT_CODES.SUPPLIER_PAYABLES);
  if (!bank || !payables) throw new AppError(i18n.t('serviceErrors.supplierPaymentNotPosted'));

  const result = postJournalEntry(
    {
      entryDate: paidDate,
      description: paymentDescription(invoiceId, input.supplierName),
      lines: [
        { accountId: payables.id, debitAmount: input.amount, creditAmount: 0 },
        { accountId: bank.id, debitAmount: 0, creditAmount: input.amount },
      ],
    },
    paymentSource(invoiceId),
  );
  if (!result.ok) throw new AppError(firstError(result.errors));
}

/** Saves an invoice and re-posts its ledger entries (registration + payment) as needed. */
export function saveSupplierInvoiceWithPosting(input: SupplierInvoiceInput, id: number | null, paidDate: string | null): void {
  withTransaction(() => {
    if (id === null) {
      const invoiceId = insertSupplierInvoice(input);
      postInvoiceEntry(invoiceId, input);
      if (paidDate !== null) {
        markInvoicePaid(invoiceId, paidDate);
        postPaymentEntry(invoiceId, input, paidDate);
      }
      return;
    }
    const current = findSupplierInvoice(id);
    if (!current) throw new AppError(i18n.t('serviceErrors.supplierInvoiceNotPosted'));
    reverseSourceEntries(invoiceSource(id));
    reverseSourceEntries(paymentSource(id));
    updateSupplierInvoice(id, input);
    markInvoicePaid(id, paidDate);
    postInvoiceEntry(id, input);
    if (paidDate !== null) postPaymentEntry(id, input, paidDate);
  });
}

/** Marks an unpaid invoice as paid and posts its bank payment. */
export function paySupplierInvoiceWithPosting(id: number, paidDate: string): void {
  const current = findSupplierInvoice(id);
  if (!current) throw new AppError(i18n.t('serviceErrors.supplierInvoiceNotPosted'));
  if (current.paid) return;
  withTransaction(() => {
    markInvoicePaid(id, paidDate);
    postPaymentEntry(
      id,
      {
        invoiceDate: current.invoiceDate,
        supplierName: current.supplierName,
        description: current.description,
        amount: current.amount,
        expenseAccountId: current.expenseAccountId,
      },
      paidDate,
    );
  });
}

/** Marks a paid invoice as unpaid again and reverses its bank payment. */
export function unpaySupplierInvoiceWithPosting(id: number): void {
  const current = findSupplierInvoice(id);
  if (!current) throw new AppError(i18n.t('serviceErrors.supplierInvoiceNotPosted'));
  if (!current.paid) return;
  withTransaction(() => {
    reverseSourceEntries(paymentSource(id));
    markInvoicePaid(id, null);
  });
}

export function removeSupplierInvoiceWithPosting(id: number): void {
  withTransaction(() => {
    reverseSourceEntries(invoiceSource(id));
    reverseSourceEntries(paymentSource(id));
    deleteSupplierInvoice(id);
  });
}
