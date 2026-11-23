ALTER TABLE meter_readings ADD COLUMN advance_months INTEGER NOT NULL DEFAULT 0;
ALTER TABLE meter_readings ADD COLUMN advance_monthly_amount REAL NOT NULL DEFAULT 0;
