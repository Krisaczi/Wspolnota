# Housing Community Manager — Tauri v2 Desktop App

This app now runs as an offline Windows desktop application built with Tauri v2.

## Requirements (on a Windows build machine)

1. Rust (from https://rustup.rs) with the `msvc` toolchain
2. Node.js 20+
3. Visual Studio Build Tools with the "Desktop development with C++" workload
4. WebView2 (pre-installed on Windows 10/11)

## Commands

```bash
npm install          # once
npm run tauri dev    # run the desktop app in development mode
npm run tauri build  # produce the Windows installers
```

After `npm run tauri build`, installers land in `src-tauri/target/release/bundle/`:
- `msi/` — Windows Installer (.msi)
- `nsis/` — NSIS installer (.exe)

Both are produced. The NSIS installer supports per-user installs and English/Polish language selection.

## Data storage

- Live database: `%APPDATA%\com.housingcommunity.manager\housing-community-manager.sqlite`
- Automatic backups: the same folder, `backups\` subfolder
- A backup is made automatically at every app start (older than the newest 14 are pruned), plus before every restore or reset.

## Architecture notes

- The Rust shell owns the database file, migrations, and backups; the React layer runs the SQL engine in-memory (sql.js) and writes the complete database file back through Rust after every transaction, using an atomic temp-file rename.
- PDF/Excel exports render in the app (embedded DejaVu fonts for Polish characters), then open a native Windows save dialog to choose the destination.
- Single-instance: launching the app twice focuses the existing window instead.
- Window size/position is remembered between runs.
