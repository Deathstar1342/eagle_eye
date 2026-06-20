import { ipcMain, app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const db = new Database("EagleEye.db");
db.exec(`
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_tag TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'Available',
    location TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS current_checkouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    asset_tag TEXT UNIQUE NOT NULL,
    checkout_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    student_id TEXT NOT NULL,
    asset_tag TEXT NOT NULL,
    action TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);
`);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#020617",
    webPreferences: {
      preload: path.join(__dirname$1, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname$1, "../renderer/index.html"));
  }
}
ipcMain.handle("checkout-asset", (event, { studentId, assetTag }) => {
  const tag = assetTag.trim().toUpperCase();
  console.log("CHECKOUT REQUEST:", studentId, tag);
  db.prepare(`
    INSERT OR IGNORE INTO assets (asset_tag, name, type, status, location)
    VALUES (?, ?, ?, 'Available', 'Esports Lab')
  `).run(tag, tag, "Unknown");
  db.prepare(`
    INSERT OR REPLACE INTO current_checkouts (student_id, asset_tag)
    VALUES (?, ?)
  `).run(studentId, tag);
  db.prepare(`
    UPDATE assets
    SET status = 'Checked Out', location = ?
    WHERE asset_tag = ?
  `).run(studentId, tag);
  db.prepare(`
    INSERT INTO logs (student_id, asset_tag, action)
    VALUES (?, ?, 'Checked Out')
  `).run(studentId, tag);
  const assets = db.prepare("SELECT * FROM assets ORDER BY asset_tag").all();
  console.log("ASSETS NOW:", assets);
  return assets;
});
ipcMain.handle("checkin-asset", (event, { studentId, assetTag }) => {
  db.prepare(`
        DELETE FROM current_checkouts
        WHERE asset_tag=?
    `).run(assetTag);
  db.prepare(`
        UPDATE assets
        SET status='Available',
            location='Esports Lab'
        WHERE asset_tag=?
    `).run(assetTag);
  db.prepare(`
        INSERT INTO logs
        (student_id, asset_tag, action)
        VALUES (?, ?, 'Checked In')
    `).run(studentId, assetTag);
  return true;
});
ipcMain.handle("get-assets", () => {
  return db.prepare(
    "SELECT * FROM assets ORDER BY asset_tag"
  ).all();
});
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
