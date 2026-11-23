ALTER TABLE accounts ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN opening_balance_date TEXT;
