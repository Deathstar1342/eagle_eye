import React, { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [assets, setAssets] = useState([])
  const [studentId, setStudentId] = useState('')
  const [assetTag, setAssetTag] = useState('')
  const [message, setMessage] = useState('Ready for student checkout')

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
      const updatedAssets = await window.eagleAPI.checkoutAsset(studentId, assetTag)
      setAssets(updatedAssets)
    } else {
      await window.eagleAPI.checkinAsset(studentId, assetTag)
    }

    setMessage(`${action}: ${assetTag.toUpperCase()} / ${studentId}`)
    setStudentId('')
    setAssetTag('')
    await loadAssets()
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🦅</div>
        <h2>UMW Eagles</h2>

        <nav>
          <button className="active">Checkout Station</button>
          <button>Assets</button>
          <button>Logs</button>
          <button>Reports</button>
          <button>Admin Login</button>
        </nav>

        <div className="user-card">
          <strong>Eagle Eye</strong>
          <span>Student Asset System</span>
        </div>
      </aside>

      <main className="dashboard">
        <section className="hero">
          <p>UMW Esports</p>
          <h1>Eagle Eye</h1>
          <h3>Asset Tracker</h3>
        </section>

        <section className="stats">
          <div className="card"><span>Total Assets</span><strong>{assets.length}</strong></div>
          <div className="card"><span>Checked Out</span><strong>{assets.filter(a => a.status === 'Checked Out').length}</strong></div>
          <div className="card"><span>Available</span><strong>{assets.filter(a => a.status === 'Available').length}</strong></div>
          <div className="card"><span>Maintenance</span><strong>{assets.filter(a => a.status === 'Maintenance').length}</strong></div>
        </section>

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

        <section className="panel">
          <div className="panel-header">
            <h2>Live Inventory</h2>
            <button className="add-btn">Admin Tools</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Location / Student</th>
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
