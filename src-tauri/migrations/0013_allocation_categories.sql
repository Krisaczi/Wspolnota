-- Allocations now record which owner charge category is being settled instead of a
-- ledger account: payments must never post to revenue accounts. Old account-based
-- rows are mapped to categories (1100/7010 -> operating, 7030 -> meter, 2010 -> overpayment).
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
