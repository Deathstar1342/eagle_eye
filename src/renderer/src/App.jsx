import './App.css'
import React from 'react'

const assets = [
  ['PC-001', 'Alienware Aurora R15', 'Desktop', 'Available', 'Esports Lab 1'],
  ['MON-015', 'ASUS ROG Swift PG259QN', 'Monitor', 'Checked Out', 'John D.'],
  ['KEY-007', 'SteelSeries Apex Pro TKL', 'Keyboard', 'Available', 'Esports Lab 2'],
  ['MOU-009', 'Logitech G Pro X Superlight', 'Mouse', 'Checked Out', 'Sarah M.'],
  ['HEAD-004', 'HyperX Cloud II Wireless', 'Headset', 'Maintenance', 'Repair Shelf'],
]

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🦅</div>
        <h2>UMW Eagles</h2>

        <nav>
          <button className="active">Dashboard</button>
          <button>Assets</button>
          <button>Checkouts</button>
          <button>Check-ins</button>
          <button>Reports</button>
          <button>Settings</button>
        </nav>

        <div className="user-card">
          <strong>Admin User</strong>
          <span>Administrator</span>
        </div>
      </aside>

      <main className="dashboard">
        <section className="hero">
          <p>Welcome back, Admin</p>
          <h1>Eagle Eye</h1>
          <h3>Asset Tracker</h3>
        </section>

        <section className="stats">
          <div className="card"><span>Total Assets</span><strong>142</strong></div>
          <div className="card"><span>Checked Out</span><strong>23</strong></div>
          <div className="card"><span>Available</span><strong>119</strong></div>
          <div className="card"><span>Maintenance</span><strong>5</strong></div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Recent Assets</h2>
            <button className="add-btn">+ Add Asset</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Asset Tag</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Location / User</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset[0]}>
                  <td>{asset[0]}</td>
                  <td>{asset[1]}</td>
                  <td>{asset[2]}</td>
                  <td>
                    <span className={`badge ${asset[3].toLowerCase().replace(' ', '-')}`}>
                      {asset[3]}
                    </span>
                  </td>
                  <td>{asset[4]}</td>
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
