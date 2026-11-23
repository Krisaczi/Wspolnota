-- Supplier invoices with their own ledger posting, plus a wider journal source
-- type CHECK (cannot be altered in place).
CREATE TABLE supplier_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_date TEXT NOT NULL CHECK (invoice_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  supplier_name TEXT NOT NULL CHECK (length(trim(supplier_name)) > 0),
  description TEXT,
  amount REAL NOT NULL CHECK (amount > 0),
  expense_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1)),
  paid_date TEXT
);
CREATE INDEX idx_supplier_invoices_date ON supplier_invoices(invoice_date);

CREATE TABLE other_income (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  income_date TEXT NOT NULL CHECK (income_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  income_type TEXT NOT NULL CHECK (income_type IN ('interest', 'other')),
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT
);

ALTER TABLE journal_entries RENAME TO journal_entries_old;
ALTER TABLE journal_entry_lines RENAME TO journal_entry_lines_old;

CREATE TABLE journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  source_type TEXT CHECK (source_type IS NULL OR source_type IN ('payment', 'billing', 'starting_balance', 'meter', 'supplier_invoice', 'supplier_payment', 'other_income')),
  source_id INTEGER,
  reversal_of_id INTEGER REFERENCES journal_entries(id) ON DELETE RESTRICT
);

INSERT INTO journal_entries (id, entry_date, description, created_at, source_type, source_id, reversal_of_id)
  SELECT id, entry_date, description, created_at, source_type, source_id, reversal_of_id
    FROM journal_entries_old ORDER BY id;

CREATE TABLE journal_entry_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit_amount REAL NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount REAL NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);

INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_amount, credit_amount)
  SELECT id, journal_entry_id, account_id, debit_amount, credit_amount
    FROM journal_entry_lines_old ORDER BY id;

DROP TABLE journal_entry_lines_old;
DROP TABLE journal_entries_old;

CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_source ON journal_entries(source_type, source_id);
CREATE INDEX idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_entry_lines(account_id);
