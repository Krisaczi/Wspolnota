import type { Database } from 'sql.js';
import { ACCOUNTING_SCHEMA_SQL } from './schema/accountingSchema';

interface Migration {
  version: number;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE owners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT
      );

      CREATE TABLE apartments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_number TEXT NOT NULL UNIQUE,
        owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT,
        area_m2 REAL NOT NULL DEFAULT 0 CHECK (area_m2 >= 0),
        residents_count INTEGER NOT NULL DEFAULT 0 CHECK (residents_count >= 0),
        share_ratio REAL NOT NULL DEFAULT 0 CHECK (share_ratio >= 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
      );

      CREATE TABLE charge_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        calculation_method TEXT NOT NULL CHECK (calculation_method IN ('per_sqm', 'per_resident', 'fixed', 'percentage')),
        rate REAL NOT NULL DEFAULT 0 CHECK (rate >= 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
      );

      CREATE TABLE monthly_charges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        charge_type_id INTEGER NOT NULL REFERENCES charge_types(id) ON DELETE RESTRICT,
        billing_period TEXT NOT NULL,
        amount REAL NOT NULL,
        UNIQUE (apartment_id, charge_type_id, billing_period)
      );
      CREATE INDEX idx_monthly_charges_period ON monthly_charges(billing_period);

      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        payment_date TEXT NOT NULL,
        amount REAL NOT NULL CHECK (amount > 0),
        description TEXT
      );
      CREATE INDEX idx_payments_apartment ON payments(apartment_id);

      CREATE TABLE meter_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE meter_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        meter_type_id INTEGER NOT NULL REFERENCES meter_types(id) ON DELETE RESTRICT,
        reading_date TEXT NOT NULL,
        reading_value REAL NOT NULL CHECK (reading_value >= 0),
        UNIQUE (apartment_id, meter_type_id, reading_date)
      );

      CREATE TABLE ownership_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        from_owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT,
        to_owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
        transfer_date TEXT NOT NULL,
        note TEXT
      );

      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT INTO meter_types (name) VALUES ('Cold water'), ('Hot water'), ('Electricity'), ('Gas'), ('Heating');
    `,
  },
  {
    version: 2,
    sql: ACCOUNTING_SCHEMA_SQL,
  },
  {
    version: 3,
    sql: `ALTER TABLE meter_readings ADD COLUMN rate REAL;`,
  },
  {
    version: 4,
    sql: `ALTER TABLE apartments ADD COLUMN starting_balance REAL NOT NULL DEFAULT 0;`,
  },
  {
    version: 5,
    sql: `
      ALTER TABLE meter_readings ADD COLUMN advance_months INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE meter_readings ADD COLUMN advance_monthly_amount REAL NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 6,
    sql: `
      CREATE TABLE interest_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
        billing_period TEXT NOT NULL,
        annual_rate REAL NOT NULL CHECK (annual_rate >= 0),
        counting_start_date TEXT NOT NULL,
        UNIQUE (apartment_id, billing_period)
      );
      CREATE INDEX idx_interest_rates_apartment ON interest_rates(apartment_id);
    `,
  },
  {
    version: 7,
    sql: `
      ALTER TABLE accounts ADD COLUMN opening_balance REAL NOT NULL DEFAULT 0;
      ALTER TABLE accounts ADD COLUMN opening_balance_date TEXT;
    `,
  },
  {
    version: 8,
    sql: `
      ALTER TABLE journal_entries RENAME TO journal_entries_old;
      ALTER TABLE journal_entry_lines RENAME TO journal_entry_lines_old;

      CREATE TABLE journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        description TEXT NOT NULL CHECK (length(trim(description)) > 0),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        source_type TEXT CHECK (source_type IS NULL OR source_type IN ('payment', 'billing')),
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
    `,
  },
  {
    version: 9,
    sql: `
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
    `,
  },
  {
    version: 10,
    sql: `
      INSERT INTO accounts (code, name, type, system_account)
        SELECT '7030', 'Meter Settlements', 'INCOME', 1
        WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE code = '7030');

      ALTER TABLE journal_entries RENAME TO journal_entries_old;
      ALTER TABLE journal_entry_lines RENAME TO journal_entry_lines_old;

      CREATE TABLE journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date TEXT NOT NULL CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        description TEXT NOT NULL CHECK (length(trim(description)) > 0),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        source_type TEXT CHECK (source_type IS NULL OR source_type IN ('payment', 'billing', 'starting_balance', 'meter')),
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
    `,
  },
  {
    version: 11,
    sql: `
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
    `,
  },
  {
    version: 12,
    sql: `
      CREATE TABLE payment_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        amount REAL NOT NULL CHECK (amount > 0),
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
      CREATE INDEX idx_payment_allocations_account ON payment_allocations(account_id);
    `,
  },
  {
    version: 13,
    sql: `
      ALTER TABLE payment_allocations RENAME TO payment_allocations_old;

      CREATE TABLE payment_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
        charge_category TEXT NOT NULL CHECK (charge_category IN ('operating', 'meter', 'maintenance', 'other', 'overpayment')),
        amount REAL NOT NULL CHECK (amount > 0),
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      INSERT INTO payment_allocations (id, payment_id, charge_category, amount, note, created_at)
        SELECT pa.id, pa.payment_id,
               CASE acc.code
                 WHEN '7030' THEN 'meter'
                 WHEN '2010' THEN 'overpayment'
                 WHEN '1100' THEN 'operating'
                 WHEN '7010' THEN 'operating'
                 ELSE 'other'
               END,
               pa.amount, pa.note, pa.created_at
          FROM payment_allocations_old pa
          JOIN accounts acc ON acc.id = pa.account_id
         ORDER BY pa.id;

      DROP TABLE payment_allocations_old;

      CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
      CREATE INDEX idx_payment_allocations_category ON payment_allocations(charge_category);
    `,
  },
];

export function runMigrations(db: Database): boolean {
  const currentVersion = Number(db.exec('PRAGMA user_version')[0].values[0][0]);
  let applied = false;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    db.exec('BEGIN TRANSACTION');
    try {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec('COMMIT');
      applied = true;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  return applied;
}
