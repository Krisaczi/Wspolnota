CREATE TABLE interest_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE RESTRICT,
  billing_period TEXT NOT NULL,
  annual_rate REAL NOT NULL CHECK (annual_rate >= 0),
  counting_start_date TEXT NOT NULL,
  UNIQUE (apartment_id, billing_period)
);
CREATE INDEX idx_interest_rates_apartment ON interest_rates(apartment_id);
