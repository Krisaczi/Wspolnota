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
