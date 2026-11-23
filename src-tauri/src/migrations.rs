use rusqlite::Connection;

/// SQL for every schema version, applied in order. Index 0 creates version 1.
const MIGRATIONS: &[&str] = &[include_str!("../migrations/0001_initial.sql"),
    include_str!("../migrations/0002_accounting.sql"),
    include_str!("../migrations/0003_meter_rate.sql"),
    include_str!("../migrations/0004_starting_balance.sql"),
    include_str!("../migrations/0005_meter_advance.sql"),
    include_str!("../migrations/0006_interest_rates.sql"),
    include_str!("../migrations/0007_opening_balance.sql"),
    include_str!("../migrations/0008_billing_source.sql"),
    include_str!("../migrations/0009_starting_balance_posting.sql"),
    include_str!("../migrations/0010_meter_posting.sql"),
    include_str!("../migrations/0011_supplier_income_posting.sql"),
    include_str!("../migrations/0012_payment_allocations.sql"),
    include_str!("../migrations/0013_allocation_categories.sql")];

/// Applies pending migrations inside transactions and returns the number applied.
pub fn run_migrations(conn: &Connection) -> Result<usize, rusqlite::Error> {
    let current: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    let mut applied = 0;
    for (index, sql) in MIGRATIONS.iter().enumerate() {
        let version = (index + 1) as i64;
        if version <= current {
            continue;
        }
        conn.execute_batch(&format!(
            "BEGIN; {sql}; PRAGMA user_version = {version}; COMMIT;"
        ))?;
        applied += 1;
    }
    Ok(applied)
}

/// The complete schema, used when creating a fresh database file.
pub fn full_schema_sql() -> String {
    MIGRATIONS.iter().map(|sql| *sql).collect::<Vec<_>>().join(";\n")
}
