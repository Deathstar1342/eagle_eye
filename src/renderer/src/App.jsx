import React, { useEffect, useState } from 'react'
import './App.css'

const emptyAssetForm = {
  assetTag: '',
  name: '',
  type: '',
  serialNumber: '',
  location: 'Esports Lab',
  notes: '',
}

function App() {
  const [assets, setAssets] = useState([])
  const [studentId, setStudentId] = useState('')
  const [assetTag, setAssetTag] = useState('')
  const [message, setMessage] = useState('Ready for student checkout')
  const [adminOpen, setAdminOpen] = useState(false)
  const [assetForm, setAssetForm] = useState(emptyAssetForm)
  const [editingTag, setEditingTag] = useState(null)

  async function loadAssets() {
    const rows = await window.eagleAPI.getAssets()
    setAssets(rows)
  }

  useEffect(() => {
    loadAssets()
  }, [])

  async function handleAction(action) {
    if (!studentId || !assetTag) {
      setMessage('Enter student ID and asset tag')
      return
    }

    if (action === 'Check Out') {
      await window.eagleAPI.checkoutAsset(studentId, assetTag)
    } else {
      await window.eagleAPI.checkinAsset(studentId, assetTag)
    }

    setMessage(`${action}: ${assetTag.toUpperCase()} / ${studentId}`)
    setStudentId('')
    setAssetTag('')
    await loadAssets()
  }

  async function handleAddAsset(e) {
    e.preventDefault()

    if (!assetForm.assetTag || !assetForm.name) {
      setMessage('Admin: asset tag and name are required')
      return
    }

    let updatedAssets

    if (editingTag) {
      updatedAssets = await window.eagleAPI.updateAsset(assetForm)
      setMessage(`Admin: updated ${assetForm.assetTag.toUpperCase()}`)
    } else {
      updatedAssets = await window.eagleAPI.addAsset(assetForm)
      setMessage(`Admin: added ${assetForm.assetTag.toUpperCase()}`)
    }

    setAssets(updatedAssets)
    setEditingTag(null)
    setAssetForm(emptyAssetForm)
  }

  async function handleDeleteAsset(assetTag) {
    const confirmed = confirm(`Delete asset ${assetTag}?`)
    if (!confirmed) return

    const updatedAssets = await window.eagleAPI.deleteAsset(assetTag)
    setAssets(updatedAssets)
    setMessage(`Admin: deleted ${assetTag}`)
  }

  function startEditAsset(asset) {
    setEditingTag(asset.asset_tag)

    setAssetForm({
      assetTag: asset.asset_tag,
      name: asset.name || '',
      type: asset.type || '',
      serialNumber: asset.serial_number || '',
      location: asset.location || 'Esports Lab',
      notes: asset.notes || '',
    })

    setAdminOpen(true)
    setMessage(`Editing ${asset.asset_tag}`)
  }

  function cancelEditAsset() {
    setEditingTag(null)
    setAssetForm(emptyAssetForm)
    setMessage('Edit cancelled')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🦅</div>
        <h2>UMW Eagles</h2>

        <nav>
          <button className={!adminOpen ? 'active' : ''} onClick={() => setAdminOpen(false)}>
            Checkout Station
          </button>
          <button className={adminOpen ? 'active' : ''} onClick={() => setAdminOpen(true)}>
            Admin Assets
          </button>
          <button>Logs</button>
          <button>Reports</button>
          <button>Settings</button>
        </nav>

        <div className="user-card">
          <strong>Eagle Eye</strong>
          <span>{adminOpen ? 'Admin Asset Tools' : 'Student Asset System'}</span>
        </div>
      </aside>

      <main className="dashboard">
        <section className="hero">
          <p>UMW Esports</p>
          <h1>Eagle Eye</h1>
          <h3>{adminOpen ? 'Admin Inventory' : 'Asset Tracker'}</h3>
        </section>

        <section className="stats">
          <div className="card"><span>Total Assets</span><strong>{assets.length}</strong></div>
          <div className="card"><span>Checked Out</span><strong>{assets.filter(a => a.status === 'Checked Out').length}</strong></div>
          <div className="card"><span>Available</span><strong>{assets.filter(a => a.status === 'Available').length}</strong></div>
          <div className="card"><span>Maintenance</span><strong>{assets.filter(a => a.status === 'Maintenance').length}</strong></div>
        </section>

        {!adminOpen ? (
          <section className="checkout-card">
            <div>
              <h2>Student Checkout</h2>
              <p>Type for now. Later, NFC reader fills student ID and scanner fills asset tag.</p>
            </div>

            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID"
            />

            <input
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              placeholder="Asset Tag"
            />

            <div className="checkout-actions">
              <button onClick={() => handleAction('Check Out')}>Check Out</button>
              <button className="secondary" onClick={() => handleAction('Check In')}>Check In</button>
            </div>

            <div className="status-box">{message}</div>
          </section>
        ) : (
          <section className="admin-card">
            <div>
              <h2>Add Asset</h2>
              <p>Add equipment to the Eagle Eye inventory.</p>
            </div>

            <form onSubmit={handleAddAsset} className="admin-form">
              <input
                value={assetForm.assetTag}
                onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                placeholder="Asset Tag"
              />

              <input
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder="Asset Name"
              />

              <input
                value={assetForm.type}
                onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                placeholder="Type"
              />

              <input
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                placeholder="Serial Number"
              />

              <input
                value={assetForm.location}
                onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                placeholder="Location"
              />

              <input
                value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                placeholder="Notes"
              />

              <button type="submit">{editingTag ? 'Save Changes' : 'Add Asset'}</button>
              {editingTag && (
                <button type="button" className="secondary-admin-btn" onClick={cancelEditAsset}>
                  Cancel Edit
                </button>
              )}
            </form>

            <div className="status-box">{message}</div>
          </section>
        )}

        <section className="panel">
          <div className="panel-header">
            <h2>{adminOpen ? 'Manage Inventory' : 'Live Inventory'}</h2>
            <button className="add-btn" onClick={() => setAdminOpen(!adminOpen)}>
              {adminOpen ? 'Checkout Mode' : 'Admin Tools'}
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Location / Student</th>
                {adminOpen && <th>Admin</th>}
              </tr>
            </thead>

            <tbody>
              {assets.map(asset => (
                <tr key={asset.asset_tag}>
                  <td>{asset.asset_tag}</td>
                  <td>{asset.name}</td>
                  <td>{asset.type || 'Unknown'}</td>
                  <td>
                    <span className={`badge ${asset.status.toLowerCase().replace(' ', '-')}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td>{asset.location || 'Esports Lab'}</td>
                  {adminOpen && (
                    <td>
                      <div className="admin-actions">
                        <button className="edit-btn" onClick={() => startEditAsset(asset)}>
                          Edit
                        </button>
                        <button className="danger-btn" onClick={() => handleDeleteAsset(asset.asset_tag)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}

export default App
