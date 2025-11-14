/* ============================================================
   uj-admin-app-pro.js
   Complete Admin Portal Frontend + Mock Backend
   Version: 1.0 (Admin — Hybrid AI–Material Design)
   Features:
    - Dashboard: counts (Approved, Rejected, Pending, Ignored) for tutoring & counselling
    - Manage Users: list tutors & counsellors, delete, suspend/reactivate
    - Reports: date range, two types (Tutoring / Counselling), export CSV (Excel) & simple PDF via print
    - Ratings & Feedback: view student ratings & comments
    - Activity Monitor: response times, ignored counts, top performers
    - Mock backend using localStorage (pre-seeds sample data if none)
   ============================================================ */

(function () {
  "use strict";

  const APP_KEY = "university_admin_portal_v1";

  /* -------------------------
     Utilities
  ------------------------- */
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const k in attrs) {
      if (k === "class") node.className = attrs[k];
      else if (k === "style") Object.assign(node.style, attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c instanceof Node) node.appendChild(c);
    });
    return node;
  };
  const uid = (prefix = "") =>
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8);

  const save = (key, val) => {
    const s = JSON.parse(localStorage.getItem(APP_KEY) || "{}");
    s[key] = val;
    localStorage.setItem(APP_KEY, JSON.stringify(s));
  };
  const load = (key, def = null) => {
    const s = JSON.parse(localStorage.getItem(APP_KEY) || "{}");
    return s[key] !== undefined ? s[key] : def;
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleString() : "";

  /* -------------------------
     Mock Data Seeding
  ------------------------- */
  function seedIfEmpty() {
    const users = load("users", null);
    if (!users) {
      const sampleTutors = [
        { id: uid("u-"), role: "tutor", name: "Alice M", email: "alice@uj.ac.za", suspended: false },
        { id: uid("u-"), role: "tutor", name: "Bongani K", email: "bongani@uj.ac.za", suspended: false },
        { id: uid("u-"), role: "tutor", name: "Chen L", email: "chen@uj.ac.za", suspended: false },
      ];
      const sampleCounsellors = [
        { id: uid("u-"), role: "counsellor", name: "Dr. Peters", email: "peters@uj.ac.za", suspended: false },
      ];
      save("users", [...sampleTutors, ...sampleCounsellors]);
    }

    const requests = load("requests", null);
    if (!requests) {
      const now = Date.now();
      const sample = [
        {
          id: uid("r-"),
          type: "tutoring",
          date: new Date(now - 1000 * 60 * 60 * 24 * 9).toISOString(),
          studentName: "Thabo",
          toId: load("users")[0].id,
          toName: load("users")[0].name,
          status: "Pending",
          rejectedBy: null,
          comments: "Needs calculus help",
          respondedAt: null
        },
        {
          id: uid("r-"),
          type: "counselling",
          date: new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString(),
          studentName: "Zanele",
          toId: load("users")[3] ? load("users")[3].id : uid("u-"),
          toName: load("users")[3] ? load("users")[3].name : "Counsellor",
          status: "Approved",
          rejectedBy: null,
          comments: "Stress & exam anxiety",
          respondedAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString()
        },
        {
          id: uid("r-"),
          type: "tutoring",
          date: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
          studentName: "Lerato",
          toId: load("users")[1].id,
          toName: load("users")[1].name,
          status: "Rejected",
          rejectedBy: "Bongani K",
          comments: "Schedule conflict",
          respondedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString()
        },
        {
          id: uid("r-"),
          type: "tutoring",
          date: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString(),
          studentName: "Siphiwe",
          toId: load("users")[2].id,
          toName: load("users")[2].name,
          status: "Ignored",
          rejectedBy: null,
          comments: "No response",
          respondedAt: null
        }
      ];
      save("requests", sample);
    }

    const ratings = load("ratings", null);
    if (!ratings) {
      const sampleRatings = [
        { id: uid("rt-"), userId: load("users")[0].id, by: "Thabo", rating: 4, comment: "Very clear", date: new Date().toISOString() },
        { id: uid("rt-"), userId: load("users")[1].id, by: "Lerato", rating: 3, comment: "Okay, arrived late", date: new Date().toISOString() },
        { id: uid("rt-"), userId: load("users")[2].id, by: "Siphiwe", rating: 5, comment: "Excellent!", date: new Date().toISOString() }
      ];
      save("ratings", sampleRatings);
    }
  }
  seedIfEmpty();

  /* -------------------------
     Mock API (localStorage)
  ------------------------- */
  const mockAPI = {
    async fetchOverview() {
      await delay(120);
      const reqs = load("requests", []);
      const tutoring = reqs.filter((r) => r.type === "tutoring");
      const counselling = reqs.filter((r) => r.type === "counselling");
      const summary = (arr) => ({
        total: arr.length,
        approved: arr.filter((r) => r.status === "Approved").length,
        rejected: arr.filter((r) => r.status === "Rejected").length,
        pending: arr.filter((r) => r.status === "Pending").length,
        ignored: arr.filter((r) => r.status === "Ignored").length,
      });
      return { ok: true, tutoring: summary(tutoring), counselling: summary(counselling) };
    },

    async fetchUsers(role = null) {
      await delay(80);
      const users = load("users", []);
      return (role ? users.filter((u) => u.role === role) : users).slice();
    },

    async deleteUser(id) {
      await delay(100);
      let users = load("users", []);
      users = users.filter((u) => u.id !== id);
      save("users", users);

      // reassigned requests: mark toName as "Deleted Account" for visibility
      let reqs = load("requests", []);
      reqs = reqs.map((r) => (r.toId === id ? { ...r, toName: "Deleted Account" } : r));
      save("requests", reqs);
      return { ok: true };
    },

    async toggleSuspendUser(id) {
      await delay(80);
      const users = load("users", []);
      const i = users.findIndex((u) => u.id === id);
      if (i < 0) return { ok: false };
      users[i].suspended = !users[i].suspended;
      save("users", users);
      return { ok: true, user: users[i] };
    },

    async fetchRequests({ from, to, type } = {}) {
      await delay(120);
      let reqs = load("requests", []).slice();
      if (type) reqs = reqs.filter((r) => r.type === type);
      if (from) reqs = reqs.filter((r) => new Date(r.date) >= new Date(from));
      if (to) reqs = reqs.filter((r) => new Date(r.date) <= new Date(to));
      return reqs;
    },

    async fetchRatings(userId = null) {
      await delay(70);
      let r = load("ratings", []).slice();
      if (userId) r = r.filter((x) => x.userId === userId);
      return r;
    },

    async fetchActivityMetrics() {
      await delay(80);
      const reqs = load("requests", []);
      const users = load("users", []);
      // For each user compute response time average and ignored count
      const metrics = users.map((u) => {
        const toReqs = reqs.filter((r) => r.toId === u.id);
        const respondedReqs = toReqs.filter((r) => r.respondedAt);
        const avgResponse = respondedReqs.length
          ? respondedReqs.reduce((sum, r) => sum + (new Date(r.respondedAt) - new Date(r.date)), 0) / respondedReqs.length
          : null;
        const ignored = toReqs.filter((r) => r.status === "Ignored").length;
        const completed = toReqs.filter((r) => r.status === "Approved").length;
        return {
          userId: u.id,
          name: u.name,
          role: u.role,
          avgResponseMs: avgResponse,
          ignored,
          completed,
          total: toReqs.length,
        };
      });
      return metrics.sort((a, b) => (b.completed || 0) - (a.completed || 0));
    }
  };

  /* -------------------------
     Exports (CSV / PDF)
  ------------------------- */
  function downloadCSV(filename, rows) {
    if (!rows || !rows.length) {
      showToast("No data to export");
      return;
    }
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${(r[k] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadPDFviaPrint(title, htmlContent) {
    // opens a new window with printable content
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { showToast("Popup blocked. Allow popups to export PDF."); return; }
    w.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}
            table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #ddd;padding:8px;text-align:left}
            th{background:#f4f4f4}
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    w.document.close();
    // Give it time to render then print
    setTimeout(() => { w.print(); }, 300);
  }

  /* -------------------------
     UI Builder
  ------------------------- */
  const buildUI = () => {
    const uni = detectUni();
    const root = el("div", { class: "admin-dashboard" });
    root.innerHTML = `
      <style>
        :root {
          --uj-main:#002147;
          --accent:#e8b500;
        }
        .admin-dashboard {
          width:100%;
          max-width:1200px;
          margin:24px auto;
          display:flex;
          border-radius:12px;
          overflow:hidden;
          background:rgba(255,255,255,0.95);
          box-shadow:0 12px 35px rgba(0,0,0,.12);
          font-family:Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }
        .side {
          width:260px;
          background:linear-gradient(180deg,var(--${uni}-main),#222);
          color:#fff;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .side h2 { padding:18px;text-align:center;font-size:1.1rem;border-bottom:1px solid rgba(255,255,255,.08);margin:0;}
        .side .nav { display:flex;flex-direction:column;padding:6px 0; }
        .side button { background:none;border:none;color:#fff;padding:12px 18px;text-align:left;cursor:pointer;font-size:14px;border-top:1px solid rgba(255,255,255,.03)}
        .side button:hover, .side button.active { background:rgba(255,255,255,0.07) }
        .content { flex:1;padding:20px 24px;overflow:auto;max-height:calc(100vh - 48px) }
        .card { background:#fff;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.06);padding:14px;margin-bottom:18px }
        .topbar { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px }
        .mini { display:flex;gap:12px;flex-wrap:wrap }
        .stat { background:linear-gradient(180deg,#fff,#fafafa);padding:12px;border-radius:8px;min-width:140px }
        .list-row { display:flex;justify-content:space-between;align-items:center;padding:8px 6px;border-bottom:1px solid #f2f2f2 }
        .muted { color:#666;font-size:13px }
        input,textarea,select { width:100%;padding:8px;border-radius:6px;border:1px solid #ddd;margin-top:6px }
        button.action { padding:8px 12px;border-radius:6px;border:none;background:var(--${uni}-main);color:#fff;cursor:pointer }
        .small { padding:6px 8px;font-size:13px;border-radius:6px }
        .toast { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 16px;border-radius:8px;opacity:.95;z-index:9999 }
        .search-row { display:flex;gap:10px;align-items:center }
        .tag { padding:6px 8px;border-radius:6px;background:#f3f3f3;font-size:13px }
        .badge { background:#eee;padding:4px 8px;border-radius:20px;font-size:12px }
      </style>

      <div class="side">
        <div>
          <h2>University Admin</h2>
          <div class="nav">
            <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
            <button class="nav-btn" data-view="users">👥 Manage Users</button>
            <button class="nav-btn" data-view="reports">🧾 Reports</button>
            <button class="nav-btn" data-view="ratings">⭐ Ratings & Feedback</button>
            <button class="nav-btn" data-view="activity">📈 Activity Monitor</button>
            <button class="nav-btn" data-view="settings">⚙️ Settings</button>
          </div>
        </div>
        <div style="padding:12px;">
          <button id="logoutBtn" class="small" style="background:transparent;border:1px solid rgba(255,255,255,.08);color:#fff;width:100%;">🔒 Logout</button>
        </div>
      </div>

      <div class="content" id="mainContent">
        <div class="topbar">
          <div><strong>Admin Portal</strong> <span class="muted">— Manage tutoring & counselling</span></div>
          <div class="mini">
            <div class="tag" id="uniTag">${detectUni().toUpperCase()}</div>
            <div class="tag" id="timeTag">${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div id="viewContainer"></div>
      </div>
    `;
    return root;
  };

  /* -------------------------
     Views
  ------------------------- */

  const VIEWS = {
    async dashboard() {
      const wrap = el("div");
      const card = el("div", { class: "card" });
      card.append(el("h3", {}, "Overview"));
      const data = await mockAPI.fetchOverview();
      const row = el("div", { class: "mini" });
      const mkStat = (title, v) => el("div", { class: "stat" }, [
        el("div", { style: { fontSize: "13px", color: "#666" } }, title),
        el("div", { style: { fontSize: "20px", fontWeight: "700", marginTop: "6px" } }, v)
      ]);
      row.append(
        mkStat("Tutoring — Total", data.tutoring.total),
        mkStat("Tutoring — Approved", data.tutoring.approved),
        mkStat("Tutoring — Rejected", data.tutoring.rejected),
        mkStat("Tutoring — Pending", data.tutoring.pending),
        mkStat("Tutoring — Ignored", data.tutoring.ignored)
      );
      card.append(row);
      // Counselling
      const card2 = el("div", { class: "card" });
      card2.append(el("h3", {}, "Counselling Overview"));
      const row2 = el("div", { class: "mini" });
      row2.append(
        mkStat("Counselling — Total", data.counselling.total),
        mkStat("Counselling — Approved", data.counselling.approved),
        mkStat("Counselling — Rejected", data.counselling.rejected),
        mkStat("Counselling — Pending", data.counselling.pending),
        mkStat("Counselling — Ignored", data.counselling.ignored)
      );
      card2.append(row2);

      // Quick recent requests
      const recentCard = el("div", { class: "card" });
      recentCard.append(el("h3", {}, "Recent Requests"));
      const list = el("div");
      const reqs = (load("requests", [])).slice().sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,6);
      if (!reqs.length) list.append(el("div", {}, "No requests"));
      reqs.forEach((r) => {
        const row = el("div", { class: "list-row" });
        row.append(
          el("div", {}, [
            el("div", { style: { fontWeight: "600" } }, `${r.studentName} — ${r.type}`),
            el("div", { class: "muted" }, `${fmtDate(r.date)} → ${r.toName || "—"}`)
          ]),
          el("div", {}, el("span", { class: "badge" }, r.status))
        );
        list.append(row);
      });
      recentCard.append(list);

      wrap.append(card, card2, recentCard);
      return wrap;
    },

    async users() {
      const container = el("div");
      container.append(el("h3", {}, "Manage Users"));

      const controls = el("div", { style: { display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" } });
      const filter = el("select", {}, [
        el("option", { value: "" }, "All Roles"),
        el("option", { value: "tutor" }, "Tutors"),
        el("option", { value: "counsellor" }, "Counsellors")
      ]);
      const search = el("input", { placeholder: "Search name or email" });
      const refreshBtn = el("button", { class: "action small" }, "Refresh");
      controls.append(filter, search, refreshBtn);
      container.append(controls);

      const listWrap = el("div", { class: "card" });
      async function render() {
        listWrap.innerHTML = "";
        const role = filter.value || null;
        const users = await mockAPI.fetchUsers(role);
        const q = (search.value || "").toLowerCase().trim();
        const filtered = users.filter((u) => !q || (u.name + " " + u.email).toLowerCase().includes(q));
        if (!filtered.length) listWrap.append(el("div", {}, "No users found"));
        filtered.forEach((u) => {
          const row = el("div", { class: "list-row" });
          const left = el("div", {}, [
            el("div", { style: { fontWeight: "600" } }, `${u.name} ${u.suspended ? " (Suspended)" : ""}`),
            el("div", { class: "muted" }, `${u.email} • ${u.role}`)
          ]);
          const right = el("div", {});
          const suspendBtn = el("button", { class: "small" }, u.suspended ? "Reactivate" : "Suspend");
          const delBtn = el("button", { class: "small", style: { marginLeft: "8px", background: "#ff5858", color: "#fff" } }, "Delete");
          suspendBtn.onclick = async () => {
            await mockAPI.toggleSuspendUser(u.id);
            showToast(`${u.suspended ? "Reactivated" : "Suspended"} ${u.name}`);
            await render();
          };
          delBtn.onclick = async () => {
            if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
            await mockAPI.deleteUser(u.id);
            showToast(`Deleted ${u.name}`);
            await render();
          };
          const detailsBtn = el("button", { class: "small", style: { marginLeft: "8px" } }, "View");
          detailsBtn.onclick = () => openUserModal(u, render);
          right.append(suspendBtn, delBtn, detailsBtn);
          row.append(left, right);
          listWrap.append(row);
        });
      }
      refreshBtn.onclick = render;
      filter.onchange = render;
      search.oninput = () => setTimeout(render, 200);
      await render();

      container.append(listWrap);
      return container;
    },

    async reports() {
      const wrap = el("div");
      wrap.append(el("h3", {}, "Generate Reports"));

      const controls = el("div", { class: "card" });
      const from = el("input", { type: "date" });
      const to = el("input", { type: "date" });
      const type = el("select", {}, [el("option", { value: "" }, "All"), el("option", { value: "tutoring" }, "Tutoring Requests"), el("option", { value: "counselling" }, "Counselling Requests")]);
      const runBtn = el("button", { class: "action" }, "Generate");
      const exportCSVBtn = el("button", { class: "small", style: { marginLeft: "8px" } }, "Export CSV");
      const exportPDFBtn = el("button", { class: "small", style: { marginLeft: "8px" } }, "Export PDF");

      controls.append(el("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, [el("div", {}, ["From", from]), el("div", {}, ["To", to]), el("div", {}, ["Type", type]), runBtn, exportCSVBtn, exportPDFBtn]));
      wrap.append(controls);

      const results = el("div", { class: "card" });
      let currentRows = [];

      async function generate() {
        results.innerHTML = "";
        const rows = await mockAPI.fetchRequests({ from: from.value || null, to: to.value || null, type: type.value || null });
        if (!rows.length) { results.append(el("div", {}, "No results for this range/type.")); currentRows = []; return; }
        const table = el("table", { style: { width: "100%", borderCollapse: "collapse" } });
        const thead = el("thead");
        thead.append(el("tr", {}, [
          el("th", {}, "Student"),
          el("th", {}, "Date"),
          el("th", {}, "Type"),
          el("th", {}, "Sent To"),
          el("th", {}, "Status"),
          el("th", {}, "Rejected By"),
          el("th", {}, "Comments")
        ]));
        table.append(thead);
        const tbody = el("tbody");
        rows.forEach((r) => {
          const tr = el("tr");
          tr.append(
            el("td", {}, r.studentName),
            el("td", {}, fmtDate(r.date)),
            el("td", {}, r.type),
            el("td", {}, r.toName || "—"),
            el("td", {}, r.status),
            el("td", {}, r.rejectedBy || "—"),
            el("td", {}, r.comments || "")
          );
          tbody.append(tr);
        });
        table.append(tbody);
        results.append(table);
        currentRows = rows.map((r) => ({
          studentName: r.studentName,
          date: fmtDate(r.date),
          type: r.type,
          toName: r.toName || "",
          status: r.status,
          rejectedBy: r.rejectedBy || "",
          comments: r.comments || ""
        }));
      }

      runBtn.onclick = generate;
      exportCSVBtn.onclick = () => {
        downloadCSV("requests_report.csv", currentRows);
      };
      exportPDFBtn.onclick = () => {
        if (!currentRows.length) return showToast("No data to export");
        // build HTML table
        const html = `<h2>Requests Report</h2><table><thead><tr>${Object.keys(currentRows[0]).map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${currentRows.map(r=>`<tr>${Object.values(r).map(v=>`<td>${String(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        downloadPDFviaPrint("Requests Report", html);
      };

      wrap.append(results);
      return wrap;
    },

    async ratings() {
      const wrap = el("div");
      wrap.append(el("h3", {}, "Ratings & Feedback"));

      const controls = el("div", { style: { display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" } });
      const userSelect = el("select", {}, [el("option", { value: "" }, "All Users")]);
      const users = await mockAPI.fetchUsers();
      users.forEach((u) => userSelect.append(el("option", { value: u.id }, `${u.name} (${u.role})`)));
      controls.append(userSelect);
      wrap.append(controls);

      const list = el("div", { class: "card" });

      async function render() {
        list.innerHTML = "";
        const rid = userSelect.value || null;
        const ratings = await mockAPI.fetchRatings(rid);
        if (!ratings.length) list.append(el("div", {}, "No ratings yet."));
        ratings.forEach((r) => {
          const c = el("div", { class: "card" });
          c.append(el("div", { style: { fontWeight: 700 } }, `${r.rating} ★ — ${r.by}`));
          c.append(el("div", { class: "muted" }, `${fmtDate(r.date)}`));
          c.append(el("div", {}, r.comment || ""));
          list.append(c);
        });
      }
      userSelect.onchange = render;
      await render();

      wrap.append(list);
      return wrap;
    },

    async activity() {
      const wrap = el("div");
      wrap.append(el("h3", {}, "Activity Monitor"));

      const metrics = await mockAPI.fetchActivityMetrics();
      const table = el("div", { class: "card" });
      table.append(el("div", { style: { fontWeight: 700, marginBottom: "8px" } }, "Metrics (sorted by completed)"));
      if (!metrics.length) table.append(el("div", {}, "No data"));
      metrics.forEach((m) => {
        const row = el("div", { class: "list-row" });
        const left = el("div", {}, [
          el("div", { style: { fontWeight: 700 } }, m.name),
          el("div", { class: "muted" }, `${m.role} • Total Requests: ${m.total}`)
        ]);
        const avg = m.avgResponseMs ? `${Math.round(m.avgResponseMs / 1000)}s` : "—";
        const right = el("div", {}, [
          el("div", { style: { textAlign: "right" } }, `Avg response: ${avg}`),
          el("div", { class: "muted", style: { textAlign: "right" } }, `Ignored: ${m.ignored} • Completed: ${m.completed}`)
        ]);
        row.append(left, right);
        table.append(row);
      });

      // Top performers summary
      const top = metrics.slice(0, 3).filter(x=>x.completed>0);
      const topCard = el("div", { class: "card" });
      topCard.append(el("h4", {}, "Top Performers"));
      if (!top.length) topCard.append(el("div", {}, "No top performers yet."));
      top.forEach((t) => topCard.append(el("div", { class: "list-row" }, [el("div", {}, `${t.name} (${t.role})`), el("div", {}, `${t.completed} completed`)])));

      wrap.append(table, topCard);
      return wrap;
    },

    settings() {
      const wrap = el("div");
      wrap.append(el("h3", {}, "Settings"));
      wrap.append(el("div", { class: "card" }, [
        el("div", {}, "This demo stores data locally in your browser's localStorage. Use the buttons below to manage sample data."),
        el("div", { style:{marginTop:"8px", display:"flex", gap:"8px"} }, [
          el("button", { class: "action" , id:"resetSample"}, "Reset Sample Data"),
          el("button", { class: "small", id:"clearAll"}, "Clear All Data")
        ])
      ]));
      return wrap;
    }
  };

  /* -------------------------
     Modals & Helpers
  ------------------------- */

  function openUserModal(user, refreshCb) {
    const overlay = el("div", {
      style: {
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
      }
    });
    const box = el("div", { style: { background: "#fff", padding: "18px", borderRadius: "10px", width: "420px", maxWidth: "94%" } });
    box.append(el("h3", {}, `User: ${user.name}`));
    const info = el("div", {}, [
      el("div", { class: "muted" }, `Email: ${user.email}`),
      el("div", { class: "muted" }, `Role: ${user.role}`),
      el("div", { class: "muted" }, `Suspended: ${user.suspended ? "Yes" : "No"}`)
    ]);
    const close = el("button", { class: "small", style: { marginTop: "10px" } }, "Close");
    close.onclick = () => overlay.remove();
    box.append(info, close);
    overlay.append(box);
    document.body.append(overlay);
  }

  function showToast(msg) {
    const t = el("div", { class: "toast" }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

 const uni = "uj"; // instead of detectUni()
   
  /* -------------------------
     Main init
  ------------------------- */

  async function init() {
    const cont = qs(".portal-container") || document.body;
    cont.innerHTML = "";
    const ui = buildUI();
    cont.append(ui);

    const content = ui.querySelector("#viewContainer");
    const navs = ui.querySelectorAll(".nav-btn");

    const renderView = async (v) => {
      navs.forEach((n) => n.classList.toggle("active", n.dataset.view === v));
      content.innerHTML = "";
      if (VIEWS[v]) {
        const node = await VIEWS[v]();
        content.append(node);
      } else {
        content.append(el("div", {}, "Not implemented"));
      }

      // attach settings buttons if present
      const resetSample = qs("#resetSample");
      if (resetSample) {
        resetSample.onclick = () => {
          localStorage.removeItem(APP_KEY);
          seedIfEmpty();
          showToast("Sample data reset");
          init();
        };
      }
      const clearAll = qs("#clearAll");
      if (clearAll) {
        clearAll.onclick = () => {
          if (!confirm("Clear all admin data from localStorage?")) return;
          localStorage.removeItem(APP_KEY);
          showToast("All data cleared");
          init();
        };
      }
    };

    renderView("dashboard");
    navs.forEach((n) => (n.onclick = () => renderView(n.dataset.view)));

    // update time tag clock
    setInterval(() => {
      const t = qs("#timeTag"); if (t) t.textContent = new Date().toLocaleString();
    }, 1000);

    qs("#logoutBtn").onclick = () => {
      showToast("Logged out (demo)");
      // In real app you'd clear auth and redirect
    };
  }

  document.addEventListener("DOMContentLoaded", init);

  // expose for debugging (dev only)
  window.__adminPortal = {
    load, save, mockAPI
  };

})();
