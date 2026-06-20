import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import db from './database.js'
import { ipcMain } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('checkout-asset', (event, { studentId, assetTag }) => {
  const tag = assetTag.trim().toUpperCase()
  console.log('CHECKOUT REQUEST:', studentId, tag)

  db.prepare(`
    INSERT OR IGNORE INTO assets (asset_tag, name, type, status, location)
    VALUES (?, ?, ?, 'Available', 'Esports Lab')
  `).run(tag, tag, 'Unknown')

  db.prepare(`
    INSERT OR REPLACE INTO current_checkouts (student_id, asset_tag)
    VALUES (?, ?)
  `).run(studentId, tag)

  db.prepare(`
    UPDATE assets
    SET status = 'Checked Out', location = ?
    WHERE asset_tag = ?
  `).run(studentId, tag)

  db.prepare(`
    INSERT INTO logs (student_id, asset_tag, action)
    VALUES (?, ?, 'Checked Out')
  `).run(studentId, tag)

  const assets = db.prepare('SELECT * FROM assets ORDER BY asset_tag').all()
  console.log('ASSETS NOW:', assets)

  return assets
})

ipcMain.handle('checkin-asset', (event, { studentId, assetTag }) => {

    db.prepare(`
        DELETE FROM current_checkouts
        WHERE asset_tag=?
    `).run(assetTag)

    db.prepare(`
        UPDATE assets
        SET status='Available',
            location='Esports Lab'
        WHERE asset_tag=?
    `).run(assetTag)

    db.prepare(`
        INSERT INTO logs
        (student_id, asset_tag, action)
        VALUES (?, ?, 'Checked In')
    `).run(studentId, assetTag)

    return true
})

ipcMain.handle('get-assets', () => {
    return db.prepare(
        'SELECT * FROM assets ORDER BY asset_tag'
    ).all()
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})