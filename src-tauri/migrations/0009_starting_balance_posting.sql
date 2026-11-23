-- Allow linked entries with the 'starting_balance' source type and add the
-- equity account used as the counterpart when posting apartment starting balances.
INSERT INTO accounts (code, name, type, system_account)
  SELECT '8000', 'Apartment Starting Balances', 'EQUITY', 1
  WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '8000');

ALTER TABLE journal_entries RENAME TO journal_entries_old;
ALTER TABLE journal_entry_lines RENAME TO journal_entry_lines_old;

CREATE TABLE journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  source_type TEXT CHECK (source_type IS NULL OR source_type IN ('payment', 'billing', 'starting_balance')),
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
