export const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_CODES = {
  BANK: '1010',
  CASH: '1020',
  RECEIVABLES: '1100',
  OWNER_PREPAYMENTS: '2010',
  SUPPLIER_PAYABLES: '2020',
  MONTHLY_FEES: '7010',
  INTEREST_INCOME: '7020',
  STARTING_BALANCES: '8000',
  METER_SETTLEMENTS: '7030',
  OTHER_INCOME: '7090',
} as const;

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  active: boolean;
  systemAccount: boolean;
  openingBalance: number;
  openingBalanceDate: string | null;
  createdAt: string;
  hasTransactions: boolean;
}

export interface AccountInput {
  code: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  openingBalanceDate: string | null;
}

export interface JournalLineInput {
  accountId: number | null;
  debitAmount: number;
  creditAmount: number;
}

export interface JournalEntryInput {
  entryDate: string;
  description: string;
  lines: JournalLineInput[];
}

export interface JournalEntrySource {
  sourceType: 'payment' | 'billing' | 'starting_balance' | 'meter' | 'supplier_invoice' | 'supplier_payment' | 'other_income';
  sourceId: number;
}

export interface SupplierInvoice {
  id: number;
  invoiceDate: string;
  supplierName: string;
  description: string | null;
  amount: number;
  expenseAccountId: number;
  expenseAccountCode: string;
  expenseAccountName: string;
  paid: boolean;
  paidDate: string | null;
}

export interface SupplierInvoiceInput {
  invoiceDate: string;
  supplierName: string;
  description: string | null;
  amount: number;
  expenseAccountId: number;
}

export interface OtherIncomeEntry {
  id: number;
  incomeDate: string;
  incomeType: 'interest' | 'other';
  amount: number;
  description: string | null;
}

export interface OtherIncomeInput {
  incomeDate: string;
  incomeType: 'interest' | 'other';
  amount: number;
  description: string | null;
}

export interface JournalEntry {
  id: number;
  entryDate: string;
  description: string;
  createdAt: string;
  sourceType: string | null;
  sourceId: number | null;
  reversalOfId: number | null;
  totalAmount: number;
  reversed: boolean;
}

export interface JournalLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitAmount: number;
  creditAmount: number;
}

export interface LedgerLine extends JournalLine {
  entryDate: string;
  description: string;
  runningBalance: number;
}

export interface AccountTotals {
  accountId: number;
  debit: number;
  credit: number;
}

export interface AuditEntry {
  id: number;
  createdAt: string;
  action: string;
  entity: string;
  entityId: number | null;
  summary: string;
}

export const DATE_RANGE_ALL = { from: '0000-01-01', to: '9999-12-31' } as const;

export interface DateRange {
  from: string;
  to: string;
}
