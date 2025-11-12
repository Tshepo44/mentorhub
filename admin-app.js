/*
admin-app.js
University Admin / Staff frontend logic — for managing tutors, counsellors, and all requests.

STRUCTURE
1) Integration notes
2) Backend integration points (to replace fakeServer)
3) Full JS Implementation — all UI and localStorage logic.

-----------------------
GITHUB / DEPLOY STEPS
-----------------------
1. Save as admin-app.js in your project root.
2. Add <script src="./admin-app.js" defer></script> at the bottom of index.html
3. Works fully offline using localStorage.
*/

console.log("Admin App Loaded ✅");

// ------------------------------
// 1) HELPERS
// ------------------------------
function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}
function load(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function now() {
  return new Date().toLocaleString();
}

// ------------------------------
// 2) MOCK SERVER DATA (LOCALSTORAGE)
// ------------------------------
const db = load("db", {
  tutors: [],
  counsellors: [],
  requests: [],
  admins: [{ id: "admin-1", email: "admin@uni.ac.za", password: "admin123", name: "Admin" }],
  adminLogs: [],
});

// ------------------------------
// 3) LOGIN LOGIC
// ------------------------------
let currentAdmin = load("currentAdmin", null);

function loginAdmin(email, password) {
  const found = db.admins.find(a => a.email === email && a.password === password);
  if (found) {
    currentAdmin = found;
    save("currentAdmin", found);
    logAction("login", `Admin ${found.email} logged in`);
    return true;
  }
  return false;
}

function logoutAdmin() {
  logAction("logout", `Admin ${currentAdmin?.email} logged out`);
  currentAdmin = null;
  localStorage.removeItem("currentAdmin");
  location.reload();
}

// ------------------------------
// 4) ADMIN ACTION LOGS
// ------------------------------
function logAction(action, details) {
  const logs = load("adminLogs", []);
  logs.push({ id: uid("log"), action, details, by: currentAdmin?.email || "System", time: now() });
  save("adminLogs", logs);
}

// ------------------------------
// 5) REQUEST MANAGEMENT
// ------------------------------
function approveRequest(id) {
  const req = db.requests.find(r => r.id === id);
  if (!req) return alert("Request not found");
  req.status = "approved";
  req.approvedBy = currentAdmin.email;
  req.reviewedAt = now();
  save("db", db);
  logAction("approve", `Approved request ${id}`);
  renderRequests();
}

function rejectRequest(id) {
  const req = db.requests.find(r => r.id === id);
  if (!req) return alert("Request not found");
  const reason = prompt("Enter rejection reason:");
  req.status = "rejected";
  req.rejectionReason = reason || "No reason provided";
  req.reviewedAt = now();
  req.rejectedBy = currentAdmin.email;
  save("db", db);
  logAction("reject", `Rejected request ${id} (${reason})`);
  renderRequests();
}

function deleteRequest(id) {
  if (!confirm("Delete this request?")) return;
  db.requests = db.requests.filter(r => r.id !== id);
  save("db", db);
  logAction("delete", `Deleted request ${id}`);
  renderRequests();
}

// ------------------------------
// 6) TUTOR / COUNSELLOR MANAGEMENT
// ------------------------------
function renderUsers(role) {
  const list = db[role + "s"] || [];
  const el = document.querySelector(`#${role}-list`);
  if (!el) return;
  el.innerHTML = list.map(u => `
    <div class="user-item">
      <strong>${u.name}</strong> (${u.email})
      <button onclick="removeUser('${role}', '${u.id}')">🗑️</button>
    </div>
  `).join("") || `<p>No ${role}s found</p>`;
}

function removeUser(role, id) {
  if (!confirm(`Remove this ${role}?`)) return;
  db[role + "s"] = db[role + "s"].filter(u => u.id !== id);
  save("db", db);
  logAction("remove", `Removed ${role} ${id}`);
  renderUsers(role);
}

function addUser(role) {
  const name = prompt(`Enter ${role} name:`);
  const email = prompt(`Enter ${role} email:`);
  if (!name || !email) return alert("Invalid details");
  db[role + "s"].push({ id: uid(role), name, email, created: now() });
  save("db", db);
  logAction("add", `Added ${role} ${email}`);
  renderUsers(role);
}

// ------------------------------
// 7) REPORT GENERATION
// ------------------------------
function renderReports() {
  const el = document.querySelector("#report-table");
  if (!el) return;
  const rows = db.requests.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.userName || "Unknown"}</td>
      <td>${r.category || "N/A"}</td>
      <td>${r.status || "pending"}</td>
      <td>${r.rejectionReason || "-"}</td>
      <td>${r.reviewedAt || "-"}</td>
      <td>${r.approvedBy || r.rejectedBy || "-"}</td>
    </tr>
  `).join("");
  el.innerHTML = `
    <table border="1" width="100%">
      <thead><tr>
        <th>ID</th><th>User</th><th>Category</th>
        <th>Status</th><th>Rejection Reason</th>
        <th>Reviewed At</th><th>Reviewed By</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ------------------------------
// 8) ANALYTICS
// ------------------------------
function renderStats() {
  const approved = db.requests.filter(r => r.status === "approved").length;
  const rejected = db.requests.filter(r => r.status === "rejected").length;
  const pending = db.requests.filter(r => !r.status || r.status === "pending").length;
  document.querySelector("#stat-approved").textContent = approved;
  document.querySelector("#stat-rejected").textContent = rejected;
  document.querySelector("#stat-pending").textContent = pending;
}

// ------------------------------
// 9) ADMIN LOGS VIEW
// ------------------------------
function renderLogs() {
  const el = document.querySelector("#log-list");
  if (!el) return;
  const logs = load("adminLogs", []);
  el.innerHTML = logs.reverse().map(l => `
    <div class="log-entry">
      <small>[${l.time}]</small> <strong>${l.by}</strong> — ${l.action}: ${l.details}
    </div>
  `).join("") || "<p>No logs yet</p>";
}

// ------------------------------
// 10) INITIALIZE UI
// ------------------------------
function renderRequests() {
  const el = document.querySelector("#request-list");
  if (!el) return;
  const requests = db.requests;
  el.innerHTML = requests.map(r => `
    <div class="request-card">
      <strong>${r.userName || "User"}</strong> - ${r.category || "N/A"}
      <div>Status: ${r.status || "pending"}</div>
      <button onclick="approveRequest('${r.id}')">✅ Approve</button>
      <button onclick="rejectRequest('${r.id}')">❌ Reject</button>
      <button onclick="deleteRequest('${r.id}')">🗑️ Delete</button>
    </div>
  `).join("") || "<p>No requests found</p>";
}

// ------------------------------
// 11) DASHBOARD INIT
// ------------------------------
function initAdminApp() {
  if (!currentAdmin) {
    const email = prompt("Admin Email:");
    const pass = prompt("Password:");
    if (!loginAdmin(email, pass)) return alert("Access denied.");
  }
  document.body.innerHTML = `
    <header>
      <h2>University Admin Dashboard</h2>
      <button onclick="logoutAdmin()">Logout</button>
    </header>
    <section class="stats">
      <p>✅ Approved: <span id="stat-approved">0</span></p>
      <p>❌ Rejected: <span id="stat-rejected">0</span></p>
      <p>🕓 Pending: <span id="stat-pending">0</span></p>
    </section>
    <section class="requests">
      <h3>Requests</h3>
      <div id="request-list"></div>
    </section>
    <section class="management">
      <h3>Tutors</h3>
      <button onclick="addUser('tutor')">➕ Add Tutor</button>
      <div id="tutor-list"></div>
      <h3>Counsellors</h3>
      <button onclick="addUser('counsellor')">➕ Add Counsellor</button>
      <div id="counsellor-list"></div>
    </section>
    <section class="reports">
      <h3>Reports</h3>
      <div id="report-table"></div>
    </section>
    <section class="logs">
      <h3>Admin Logs</h3>
      <div id="log-list"></div>
    </section>
  `;

  renderRequests();
  renderUsers("tutor");
  renderUsers("counsellor");
  renderReports();
  renderStats();
  renderLogs();
}

// ------------------------------
window.addEventListener("DOMContentLoaded", initAdminApp);

