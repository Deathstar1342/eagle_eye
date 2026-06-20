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

ipcMain.handle('add-asset', (event, asset) => {
  const tag = asset.assetTag.trim().toUpperCase()

  db.prepare(`
    INSERT INTO assets (asset_tag, name, type, serial_number, status, location, notes)
    VALUES (?, ?, ?, ?, 'Available', ?, ?)
  `).run(
    tag,
    asset.name,
    asset.type || 'Unknown',
    asset.serialNumber || '',
    asset.location || 'Esports Lab',
    asset.notes || ''
  )

  return db.prepare('SELECT * FROM assets ORDER BY asset_tag').all()
})

ipcMain.handle('delete-asset', (event, assetTag) => {
  const tag = assetTag.trim().toUpperCase()

  db.prepare('DELETE FROM current_checkouts WHERE asset_tag = ?').run(tag)
  db.prepare('DELETE FROM assets WHERE asset_tag = ?').run(tag)

  db.prepare(`
    INSERT INTO logs (student_id, asset_tag, action)
    VALUES ('ADMIN', ?, 'Deleted Asset')
  `).run(tag)

  return db.prepare('SELECT * FROM assets ORDER BY asset_tag').all()
})

ipcMain.handle('update-asset', (event, asset) => {
  const tag = asset.assetTag.trim().toUpperCase()

  db.prepare(`
    UPDATE assets
    SET name = ?,
        type = ?,
        serial_number = ?,
        location = ?,
        notes = ?
    WHERE asset_tag = ?
  `).run(
    asset.name,
    asset.type || 'Unknown',
    asset.serialNumber || '',
    asset.location || 'Esports Lab',
    asset.notes || '',
    tag
  )

  db.prepare(`
    INSERT INTO logs (student_id, asset_tag, action)
    VALUES ('ADMIN', ?, 'Updated Asset')
  `).run(tag)

  return db.prepare('SELECT * FROM assets ORDER BY asset_tag').all()
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})