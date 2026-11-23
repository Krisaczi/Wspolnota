CREATE TABLE IF NOT EXISTS owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT
);
CREATE TABLE IF NOT EXISTS apartments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_number TEXT NOT NULL UNIQUE,
  owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT,
  area_m2 REAL NOT NULL DEFAULT 0 CHECK (area_m2 >= 0),
  residents_count INTEGER NOT NULL DEFAULT 0 CHECK (residents_count >= 0),
  share_ratio REAL NOT NULL DEFAULT 0 CHECK (share_ratio >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
CREATE TABLE IF NOT EXISTS charge_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  calculation_method TEXT NOT NULL CHECK (calculation_method IN ('per_sqm', 'per_resident', 'fixed', 'percentage')),
  rate REAL NOT NULL DEFAULT 0 CHECK (rate >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
CREATE TABLE IF NOT EXISTS monthly_charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
  charge_type_id INTEGER NOT NULL REFERENCES charge_types(id) ON DELETE RESTRICT,
  billing_period TEXT NOT NULL,
  amount REAL NOT NULL,
  UNIQUE (apartment_id, charge_type_id, billing_period)
);
CREATE INDEX IF NOT EXISTS idx_monthly_charges_period ON monthly_charges(billing_period);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  description TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_apartment ON payments(apartment_id);
CREATE TABLE IF NOT EXISTS meter_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS meter_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
  meter_type_id INTEGER NOT NULL REFERENCES meter_types(id) ON DELETE RESTRICT,
  reading_date TEXT NOT NULL,
  reading_value REAL NOT NULL CHECK (reading_value >= 0),
  UNIQUE (apartment_id, meter_type_id, reading_date)
);
CREATE TABLE IF NOT EXISTS ownership_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
  from_owner_id INTEGER REFERENCES owners(id) ON DELETE RESTRICT,
  to_owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE RESTRICT,
  transfer_date TEXT NOT NULL,
  note TEXT
);
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO meter_types (name) VALUES ('Cold water'), ('Hot water'), ('Electricity'), ('Gas'), ('Heating');
