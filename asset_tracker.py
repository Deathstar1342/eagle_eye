import sys
import os
import sqlite3
from datetime import datetime
from typing import List, Tuple, Optional

from PySide6.QtCore import Qt
from PySide6.QtGui import QIntValidator
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QTabWidget, QVBoxLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QMessageBox, QTableWidget,
    QTableWidgetItem, QHeaderView, QGroupBox, QFormLayout, QCheckBox, QInputDialog
)

DB_FILE = "assets.db"
DEFAULT_ITEM_TYPES = ["Mouse", "Keyboard", "Controller", "Mousepad", "Cable/Wire"]

# ---------------------------- Database Layer ---------------------------- #
class Database:
    def __init__(self, path: str = DB_FILE):
        self.path = path
        self._ensure_db()

    def _ensure_db(self):
        with sqlite3.connect(self.path) as conn:
            c = conn.cursor()
            # Assets with composite primary key (asset_type, asset_id)
            c.execute(
                """
                CREATE TABLE IF NOT EXISTS assets (
                    asset_type TEXT NOT NULL,
                    asset_id   INTEGER NOT NULL,
                    status TEXT NOT NULL DEFAULT 'available',
                    checked_out_by TEXT,
                    checked_out_at TEXT,
                    PRIMARY KEY (asset_type, asset_id)
                )
                """
            )
            # History (append-only audit)
            c.execute(
                """
                CREATE TABLE IF NOT EXISTS history (
                    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    asset_type TEXT NOT NULL,
                    asset_id   INTEGER NOT NULL,
                    action TEXT NOT NULL, -- added | checked_out | checked_in | removed
                    actor TEXT,
                    timestamp TEXT NOT NULL
                )
                """
            )
            # Settings (key-value). Stores admin_password, etc.
            c.execute(
                """
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
                """
            )
            # Default admin password
            c.execute("INSERT OR IGNORE INTO settings(key, value) VALUES('admin_password','admin123')")
            conn.commit()

    # ---- Settings helpers ---- #
    def set_setting(self, key: str, value: str) -> None:
        with sqlite3.connect(self.path) as conn:
            conn.execute("REPLACE INTO settings(key, value) VALUES(?, ?)", (key, value))
            conn.commit()

    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        with sqlite3.connect(self.path) as conn:
            cur = conn.execute("SELECT value FROM settings WHERE key=?", (key,))
            row = cur.fetchone()
            return row[0] if row else default

    # ---- Asset operations (composite key: asset_type + asset_id) ---- #
    def add_asset(self, asset_id: int, asset_type: str) -> None:
        with sqlite3.connect(self.path) as conn:
            conn.execute(
                "INSERT INTO assets(asset_type, asset_id, status) VALUES(?, ?, 'available')",
                (asset_type, asset_id),
            )
            conn.execute(
                "INSERT INTO history(asset_type, asset_id, action, actor, timestamp) VALUES(?,?,?,?,?)",
                (asset_type, asset_id, 'added', None, datetime.utcnow().isoformat()),
            )
            conn.commit()

    def remove_asset(self, asset_id: int, asset_type: str) -> None:
        with sqlite3.connect(self.path) as conn:
            cur = conn.execute(
                "SELECT 1 FROM assets WHERE asset_type=? AND asset_id=?",
                (asset_type, asset_id),
            )
            if not cur.fetchone():
                raise ValueError("Asset not found")
            conn.execute(
                "DELETE FROM assets WHERE asset_type=? AND asset_id=?",
                (asset_type, asset_id),
            )
            conn.execute(
                "INSERT INTO history(asset_type, asset_id, action, actor, timestamp) VALUES(?,?,?,?,?)",
                (asset_type, asset_id, 'removed', None, datetime.utcnow().isoformat()),
            )
            conn.commit()

    def list_assets(self, only_checked_out: bool = False) -> List[Tuple]:
        with sqlite3.connect(self.path) as conn:
            if only_checked_out:
                cur = conn.execute(
                    """
                    SELECT asset_id as id, asset_type as type, status, checked_out_by, checked_out_at
                    FROM assets WHERE status='checked_out' ORDER BY type, id
                    """
                )
            else:
                cur = conn.execute(
                    """
                    SELECT asset_id as id, asset_type as type, status, checked_out_by, checked_out_at
                    FROM assets ORDER BY type, id
                    """
                )
            return cur.fetchall()

    def checkout(self, asset_id: int, asset_type: str, student: str) -> None:
        with sqlite3.connect(self.path) as conn:
            cur = conn.execute(
                "SELECT status FROM assets WHERE asset_type=? AND asset_id=?",
                (asset_type, asset_id),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError("Asset not found.")
            if row[0] != 'available':
                raise ValueError("Asset is not available.")
            ts = datetime.utcnow().isoformat()
            conn.execute(
                """
                UPDATE assets
                   SET status='checked_out', checked_out_by=?, checked_out_at=?
                 WHERE asset_type=? AND asset_id=?
                """,
                (student.strip(), ts, asset_type, asset_id),
            )
            conn.execute(
                "INSERT INTO history(asset_type, asset_id, action, actor, timestamp) VALUES(?,?,?,?,?)",
                (asset_type, asset_id, 'checked_out', student.strip(), ts),
            )
            conn.commit()

    def checkin(self, asset_id: int, asset_type: str, student: str) -> None:
        with sqlite3.connect(self.path) as conn:
            cur = conn.execute(
                "SELECT status, checked_out_by FROM assets WHERE asset_type=? AND asset_id=?",
                (asset_type, asset_id),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError("Asset not found.")
            status, by = row
            if status != 'checked_out':
                raise ValueError("Asset is not checked out.")
            if (by or '').strip().lower() != student.strip().lower():
                raise ValueError("Student name does not match checkout record.")
            ts = datetime.utcnow().isoformat()
            conn.execute(
                """
                UPDATE assets
                   SET status='available', checked_out_by=NULL, checked_out_at=NULL
                 WHERE asset_type=? AND asset_id=?
                """,
                (asset_type, asset_id),
            )
            conn.execute(
                "INSERT INTO history(asset_type, asset_id, action, actor, timestamp) VALUES(?,?,?,?,?)",
                (asset_type, asset_id, 'checked_in', student.strip(), ts),
            )
            conn.commit()

    def get_report_data(self) -> List[Tuple]:
        """Return rows for currently checked out assets: (asset_id, asset_type, checked_out_by, checked_out_at)."""
        with sqlite3.connect(self.path) as conn:
            cur = conn.execute(
                """
                SELECT asset_id, asset_type, checked_out_by, checked_out_at
                  FROM assets
                 WHERE status='checked_out'
              ORDER BY asset_type, asset_id
                """
            )
            return cur.fetchall()

# ---------------------------- UI Styling ---------------------------- #
ASSET_QSS = """
QMainWindow { background: #0f1115; }
QTabWidget::pane { border: 1px solid #2a2f3a; border-radius: 10px; }
QTabBar::tab { background: #1a1f29; color: #e6e6e6; padding: 8px 16px; border-top-left-radius: 10px; border-top-right-radius: 10px; margin-right: 2px; }
QTabBar::tab:selected { background: #2a2f3a; }
QGroupBox { border: 1px solid #2a2f3a; border-radius: 12px; margin-top: 12px; padding: 12px; color: #e6e6e6; }
QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 4px; }
QLabel { color: #cfd3dc; }
QLineEdit, QComboBox { background: #121621; color: #e6e6e6; border: 1px solid #364156; border-radius: 8px; padding: 6px; }
QPushButton { background: #2563eb; color: white; border: none; padding: 8px 14px; border-radius: 10px; font-weight: 600; }
QPushButton:hover { background: #1d4ed8; }
QPushButton:disabled { background: #364156; color: #9aa3b2; }
QTableWidget { background: #0b0e14; color: #e6e6e6; gridline-color: #2a2f3a; border: 1px solid #2a2f3a; border-radius: 10px; }
QHeaderView::section { background: #121621; color: #cfd3dc; padding: 6px; border: none; }
QCheckBox { color: #cfd3dc; }
"""

# ---------------------------- Main Window ---------------------------- #
class AssetTrackerApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.admin_verified = False  # ask once per session
        self.setWindowTitle("Esports Arena Asset Tracker")
        self.setMinimumSize(980, 640)
        self.db = Database()
        self._init_ui()
        self._refresh_tables()

    def _init_ui(self):
        self.tabs = QTabWidget()
        self.tabs.setMovable(True)

        # Inventory (password-protected)
        self.inv_tab = QWidget()
        inv_layout = QVBoxLayout(self.inv_tab)
        inv_layout.addWidget(self._build_add_group())
        inv_layout.addWidget(self._build_inventory_table())

        # Checkout tab
        co_tab = QWidget()
        co_layout = QVBoxLayout(co_tab)
        co_layout.addWidget(self._build_checkout_group())

        # Check-in tab
        ci_tab = QWidget()
        ci_layout = QVBoxLayout(ci_tab)
        ci_layout.addWidget(self._build_checkin_group())

        # Reports tab
        rs_tab = QWidget()
        rs_layout = QVBoxLayout(rs_tab)
        rs_layout.addWidget(self._build_report_group())

        self.tabs.addTab(self.inv_tab, "Inventory")
        self.tabs.addTab(co_tab, "Check Out")
        self.tabs.addTab(ci_tab, "Check In")
        self.tabs.addTab(rs_tab, "Reports")

        self.tabs.currentChanged.connect(self._on_tab_changed)

        self.setCentralWidget(self.tabs)
        self.setStyleSheet(ASSET_QSS)
        self._on_tab_changed(0)

    # ---------- Inventory UI ---------- #
    def _build_add_group(self) -> QGroupBox:
        gb = QGroupBox("Add or Remove Asset")
        form = QFormLayout()

        self.type_combo = QComboBox()
        self.type_combo.addItems(DEFAULT_ITEM_TYPES)
        self.type_combo.setEditable(False)

        self.id_input = QLineEdit()
        self.id_input.setValidator(QIntValidator(1, 10**9))

        add_btn = QPushButton("Add Asset")
        add_btn.clicked.connect(self._on_add_asset)

        self.remove_input = QLineEdit()
        self.remove_input.setValidator(QIntValidator(1, 10**9))
        remove_btn = QPushButton("Remove Asset")
        remove_btn.clicked.connect(self._on_remove_asset)

        form.addRow(QLabel("Type:"), self.type_combo)
        form.addRow(QLabel("Asset ID:"), self.id_input)
        form.addRow(add_btn)
        form.addRow(QLabel("Remove by ID:"), self.remove_input)
        form.addRow(remove_btn)

        gb.setLayout(form)
        return gb

    def _build_inventory_table(self) -> QGroupBox:
        gb = QGroupBox("Inventory Overview")
        v = QVBoxLayout()

        self.table = QTableWidget(0, 5)
        self.table.setHorizontalHeaderLabels(["ID", "Type", "Status", "Checked Out By", "Checked Out At (UTC)"])
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.Stretch)
        self.table.verticalHeader().setVisible(False)

        refresh_btn = QPushButton("Refresh")
        refresh_btn.clicked.connect(self._refresh_tables)

        v.addWidget(self.table)
        v.addWidget(refresh_btn, alignment=Qt.AlignRight)
        gb.setLayout(v)
        return gb

    def _refresh_tables(self):
        rows = self.db.list_assets()
        self.table.setRowCount(0)
        for r in rows:
            row_idx = self.table.rowCount()
            self.table.insertRow(row_idx)
            for col, val in enumerate(r):
                it = QTableWidgetItem("" if val is None else str(val))
                self.table.setItem(row_idx, col, it)

    def _on_add_asset(self):
        a_type = self.type_combo.currentText().strip()
        if not a_type:
            QMessageBox.warning(self, "Validation", "Type is required.")
            return
        try:
            a_id = int(self.id_input.text())
        except ValueError:
            QMessageBox.warning(self, "Validation", "Asset ID must be an integer.")
            return
        try:
            self.db.add_asset(a_id, a_type)
            self.id_input.clear()
            QMessageBox.information(self, "Success", f"Added {a_type} #{a_id}.")
            self._refresh_tables()
        except sqlite3.IntegrityError:
            QMessageBox.critical(self, "Error", "That type+ID already exists.")
        except Exception as e:
            QMessageBox.critical(self, "Error", str(e))

    def _on_remove_asset(self):
        text = self.remove_input.text().strip()
        a_type = self.type_combo.currentText().strip()
        if not text or not a_type:
            QMessageBox.warning(self, "Validation", "Select a type and enter an asset ID to remove.")
            return
        a_id = int(text)
        confirm = QMessageBox.question(self, "Confirm", f"Remove {a_type} #{a_id}? This cannot be undone.")
        if confirm != QMessageBox.Yes:
            return
        try:
            self.db.remove_asset(a_id, a_type)
            QMessageBox.information(self, "Removed", f"{a_type} #{a_id} was removed.")
            self._refresh_tables()
        except Exception as e:
            QMessageBox.critical(self, "Error", str(e))

    # ---------- Checkout UI ---------- #
    def _build_checkout_group(self) -> QGroupBox:
        gb = QGroupBox("Check Out Asset")
        form = QFormLayout()

        self.co_type = QComboBox()
        self.co_type.addItems(DEFAULT_ITEM_TYPES)
        self.co_type.setEditable(False)

        self.co_id = QLineEdit()
        self.co_id.setValidator(QIntValidator(1, 10**9))
        self.co_name = QLineEdit()

        btn = QPushButton("Check Out")
        btn.clicked.connect(self._on_checkout)

        form.addRow(QLabel("Type:"), self.co_type)
        form.addRow(QLabel("Asset ID:"), self.co_id)
        form.addRow(QLabel("Student Name:"), self.co_name)
        form.addRow(btn)
        gb.setLayout(form)
        return gb

    def _on_checkout(self):
        try:
            a_id = int(self.co_id.text())
        except ValueError:
            QMessageBox.warning(self, "Validation", "Asset ID must be an integer.")
            return
        a_type = self.co_type.currentText().strip()
        name = self.co_name.text().strip()
        if not a_type or not name:
            QMessageBox.warning(self, "Validation", "Type and student name are required.")
            return
        try:
            self.db.checkout(a_id, a_type, name)
            QMessageBox.information(self, "Checked Out", f"{a_type} #{a_id} checked out to {name}.")
            self.co_id.clear(); self.co_name.clear()
            self._refresh_tables()
        except Exception as e:
            QMessageBox.critical(self, "Error", str(e))

    # ---------- Check-in UI ---------- #
    def _build_checkin_group(self) -> QGroupBox:
        gb = QGroupBox("Check In Asset")
        form = QFormLayout()

        self.ci_type = QComboBox()
        self.ci_type.addItems(DEFAULT_ITEM_TYPES)
        self.ci_type.setEditable(False)

        self.ci_id = QLineEdit()
        self.ci_id.setValidator(QIntValidator(1, 10**9))
        self.ci_name = QLineEdit()

        btn = QPushButton("Check In")
        btn.clicked.connect(self._on_checkin)

        form.addRow(QLabel("Type:"), self.ci_type)
        form.addRow(QLabel("Asset ID:"), self.ci_id)
        form.addRow(QLabel("Student Name:"), self.ci_name)
        form.addRow(btn)
        gb.setLayout(form)
        return gb

    def _on_checkin(self):
        try:
            a_id = int(self.ci_id.text())
        except ValueError:
            QMessageBox.warning(self, "Validation", "Asset ID must be an integer.")
            return
        a_type = self.ci_type.currentText().strip()
        name = self.ci_name.text().strip()
        if not a_type or not name:
            QMessageBox.warning(self, "Validation", "Type and student name are required.")
            return
        try:
            self.db.checkin(a_id, a_type, name)
            QMessageBox.information(self, "Checked In", f"{a_type} #{a_id} checked in by {name}.")
            self.ci_id.clear(); self.ci_name.clear()
            self._refresh_tables()
        except Exception as e:
            QMessageBox.critical(self, "Error", str(e))

    # ---------- Reports ---------- #
    def _build_report_group(self):
        group = QGroupBox("Reports & Settings")
        layout = QVBoxLayout()

        btn_report = QPushButton("Generate Report")
        btn_report.clicked.connect(self._generate_report)
        layout.addWidget(btn_report)

        btn_change_pw = QPushButton("Change Admin Password")
        btn_change_pw.clicked.connect(self._change_password)
        layout.addWidget(btn_change_pw)

        group.setLayout(layout)
        return group

    def _on_tab_changed(self, index):
        # Only prompt once per launch for Inventory tab (index 0)
        if index == 0 and not self.admin_verified:
            stored_pw = self.db.get_setting("admin_password", "admin123")
            pw, ok = QInputDialog.getText(self, "Inventory Password", "Enter admin password:", QLineEdit.Password)
            if not ok or pw != stored_pw:
                QMessageBox.warning(self, "Access Denied", "Incorrect password. Switching to another tab.")
                self.tabs.setCurrentIndex(1)
            else:
                self.admin_verified = True

    def _generate_report(self):
        rows = self.db.get_report_data()
        if not rows:
            QMessageBox.information(self, "Report", "All good, nothing is currently checked out.")
            return
        report_path = os.path.join(os.path.dirname(DB_FILE), "checked_out_report.txt")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("Checked Out Assets Report\n\n")
            for asset_id, asset_type, student, ts in rows:
                f.write(f"ID: {asset_id}, Type: {asset_type}, Student: {student}, Time: {ts}\n")
        QMessageBox.information(self, "Report", f"Report saved to {report_path}")

    def _change_password(self):
        current_pw, ok = QInputDialog.getText(self, "Verify Password", "Enter current admin password:", QLineEdit.Password)
        if not ok:
            return
        stored_pw = self.db.get_setting("admin_password", "admin123")
        if current_pw != stored_pw:
            QMessageBox.warning(self, "Error", "Current password is incorrect.")
            return
        new_pw, ok = QInputDialog.getText(self, "New Password", "Enter new admin password:", QLineEdit.Password)
        if not ok or not new_pw.strip():
            QMessageBox.warning(self, "Error", "New password cannot be empty.")
            return
        confirm_pw, ok = QInputDialog.getText(self, "Confirm Password", "Re-enter new admin password:", QLineEdit.Password)
        if not ok or new_pw != confirm_pw:
            QMessageBox.warning(self, "Error", "Passwords do not match.")
            return
        self.db.set_setting("admin_password", new_pw.strip())
        QMessageBox.information(self, "Success", "Admin password updated successfully.")

# ---------------------------- App Bootstrap ---------------------------- #
if __name__ == '__main__':
    app = QApplication(sys.argv)
    win = AssetTrackerApp()
    win.show()
    sys.exit(app.exec())
