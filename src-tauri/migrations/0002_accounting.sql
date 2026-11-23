CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE CHECK (length(trim(code)) > 0),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  system_account INTEGER NOT NULL DEFAULT 0 CHECK (system_account IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  source_type TEXT CHECK (source_type IS NULL OR source_type IN ('payment')),
  source_id INTEGER,
  reversal_of_id INTEGER REFERENCES journal_entries(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_type, source_id);
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  debit_amount REAL NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount REAL NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  summary TEXT NOT NULL
);
INSERT OR IGNORE INTO accounts (code, name, type, system_account) VALUES
  ('1010', 'Bank Account', 'ASSET', 1),
  ('1020', 'Cash Account', 'ASSET', 1),
  ('1100', 'Receivables from Owners', 'ASSET', 1),
  ('2010', 'Owner Prepayments', 'LIABILITY', 1),
  ('2020', 'Supplier Payables', 'LIABILITY', 1),
  ('4010', 'Cleaning Services', 'EXPENSE', 1),
  ('4020', 'Electricity', 'EXPENSE', 1),
  ('4030', 'Water and Sewage', 'EXPENSE', 1),
  ('4040', 'Waste Disposal', 'EXPENSE', 1),
  ('4050', 'Bank Charges', 'EXPENSE', 1),
  ('4060', 'Maintenance and Repairs', 'EXPENSE', 1),
  ('4070', 'Insurance', 'EXPENSE', 1),
  ('4080', 'Administrative Costs', 'EXPENSE', 1),
  ('7010', 'Monthly Community Fees', 'INCOME', 1),
  ('7020', 'Interest Income', 'INCOME', 1),
  ('7090', 'Other Income', 'INCOME', 1);
