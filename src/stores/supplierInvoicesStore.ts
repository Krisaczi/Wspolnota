import { create } from 'zustand';
import { listSupplierInvoices, supplierBalances } from '../db/repositories/supplierInvoicesRepo';
import {
  paySupplierInvoiceWithPosting,
  removeSupplierInvoiceWithPosting,
  saveSupplierInvoiceWithPosting,
  unpaySupplierInvoiceWithPosting,
} from '../services/accounting/supplierInvoicePosting';
import type { SupplierInvoice, SupplierInvoiceInput } from '../domain/accounting/types';

interface SupplierInvoicesState {
  invoices: SupplierInvoice[];
  balances: { supplierName: string; balance: number }[];
  refresh: () => void;
  save: (input: SupplierInvoiceInput, id: number | null, paidDate: string | null) => void;
  markPaid: (id: number, paidDate: string) => void;
  markUnpaid: (id: number) => void;
  remove: (id: number) => void;
}

export const useSupplierInvoicesStore = create<SupplierInvoicesState>()((set) => ({
  invoices: [],
  balances: [],
  refresh: () => set({ invoices: listSupplierInvoices(), balances: supplierBalances() }),
  save: (input, id, paidDate) => {
    saveSupplierInvoiceWithPosting(input, id, paidDate);
    set({ invoices: listSupplierInvoices(), balances: supplierBalances() });
  },
  markPaid: (id, paidDate) => {
    paySupplierInvoiceWithPosting(id, paidDate);
    set({ invoices: listSupplierInvoices(), balances: supplierBalances() });
  },
  markUnpaid: (id) => {
    unpaySupplierInvoiceWithPosting(id);
    set({ invoices: listSupplierInvoices(), balances: supplierBalances() });
  },
  remove: (id) => {
    removeSupplierInvoiceWithPosting(id);
    set({ invoices: listSupplierInvoices(), balances: supplierBalances() });
  },
}));
