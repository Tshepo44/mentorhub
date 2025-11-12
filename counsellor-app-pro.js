/* ============================================================
   counselling-app-pro.js
   Complete Counsellor Portal Frontend + Mock Backend
   Version: 1.0 (Hybrid AI–Material Design)
   ============================================================ */

(function () {
  "use strict";

  const APP_KEY = "university_counselling_portal_v1";

  /* ------------------------------------------------------------
     1.  UTILITIES
  ------------------------------------------------------------ */
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

  const load = (key, def = null) => {
    const s = JSON.parse(localStorage.getItem(APP_KEY) || "{}");
    return s[key] !== undefined ? s[key] : def;
  };
  const save = (key, val) => {
    const s = JSON.parse(localStorage.getItem(APP_KEY) || "{}");
    s[key] = val;
    localStorage.setItem(APP_KEY, JSON.stringify(s));
  };

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const fmtDate = (d) => new Date(d).toLocaleString();

  const detectUni = () => {
    const p = location.pathname.toLowerCase();
    if (p.includes("uj")) return "uj";
    if (p.includes("wits")) return "wits";
    return "up";
  };

  /* ------------------------------------------------------------
     2.  MOCK BACKEND  (Local Only)
  ------------------------------------------------------------ */
  const mockAPI = {
    async registerCounsellor(profile) {
      await delay(200);
      const counsellors = load("counsellors", {});
      profile.id = profile.id || uid("counsellor-");
      counsellors[profile.id] = profile;
      save("counsellors", counsellors);
      return { ok: true, counsellor: profile };
    },

    async loginCounsellor({ email, counsellorNumber, password }) {
      await delay(200);
      const counsellors = Object.values(load("counsellors", {}));
      const found = counsellors.find(
        (c) => c.email === email || c.counsellorNumber === counsellorNumber
      );
      if (found && (!password || password === found.password))
        return { ok: true, counsellor: found };
      return { ok: false, error: "Invalid credentials" };
    },

    async fetchRequests(counsellorId) {
      await delay(150);
      const reqs = load("requests", []);
      return reqs.filter((r) => r.counsellorId === counsellorId);
    },

    async updateRequest(id, patch) {
      const reqs = load("requests", []);
      const i = reqs.findIndex((r) => r.id === id);
      if (i < 0) return { ok: false };
      reqs[i] = { ...reqs[i], ...patch };
      save("requests", reqs);
      return { ok: true, request: reqs[i] };
    },

    async submitReport(data) {
      const reports = load("reports", []);
      reports.push(data);
      save("reports", reports);
      return { ok: true };
    },

    async uploadVideo(video) {
      const vids = load("videos", []);
      vids.push(video);
      save("videos", vids);
      return { ok: true };
    },

    async fetchRatings(counsellorId) {
      const rs = load("ratings", []);
      return rs.filter((r) => r.counsellorId === counsellorId);
    },
  };

  /* ------------------------------------------------------------
     3.  DASHBOARD LAYOUT + DESIGN
  ------------------------------------------------------------ */
  const buildUI = (counsellor, uni) => {
    const root = el("div", { class: "counsellor-dashboard" });
    root.innerHTML = `
      <style>
        :root {
          --uj-main:#f36f21;
          --up-main:#004b8d;
          --wits-main:#002147;
          --accent:#e8b500;
        }
        .counsellor-dashboard {
          width:100%;
          max-width:1200px;
          margin:30px auto;
          display:flex;
          border-radius:16px;
          overflow:hidden;
          background:rgba(255,255,255,0.8);
          backdrop-filter:blur(20px);
          box-shadow:0 10px 35px rgba(0,0,0,.2);
        }
        .side {
          width:250px;
          background:linear-gradient(180deg,var(--${uni}-main),#222);
          color:#fff;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .side h2 {
          padding:20px;
          text-align:center;
          font-size:1.3rem;
          border-bottom:1px solid rgba(255,255,255,.2);
        }
        .side button {
          background:none;
          border:none;
          color:#fff;
          padding:14px 20px;
          text-align:left;
          cursor:pointer;
          width:100%;
          font-size:15px;
          border-bottom:1px solid rgba(255,255,255,.08);
        }
        .side button:hover, .side button.active {
          background:rgba(255,255,255,0.15);
        }
        .content {
          flex:1;
          padding:25px 35px;
          overflow-y:auto;
          max-height:calc(100vh - 100px);
        }
        .card {
          background:#fff;
          border-radius:12px;
          box-shadow:0 3px 15px rgba(0,0,0,.08);
          padding:20px;
          margin-bottom:20px;
          transition:transform .2s;
        }
        .card:hover { transform:translateY(-2px); }
        .topbar {
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:15px;
        }
        .avail-indicator {
          width:14px;height:14px;border-radius:50%;
          margin-right:6px;display:inline-block;
          background:${counsellor?.availableNow ? "limegreen" : "#ccc"};
          box-shadow:0 0 8px ${counsellor?.availableNow ? "limegreen" : "transparent"};
        }
        input,textarea,select {
          width:100%;padding:8px 10px;margin:6px 0 12px 0;
          border-radius:6px;border:1px solid #ccc;font-size:14px;
        }
        button.action {
          padding:8px 12px;border-radius:6px;border:none;
          background:var(--${uni}-main);color:#fff;cursor:pointer;
        }
        .toast {
          position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
          background:#222;color:#fff;padding:10px 20px;border-radius:6px;
          opacity:.95;z-index:9999;transition:opacity .3s;
        }
      </style>

      <div class="side">
        <div>
          <h2>${counsellor?.name || "Counsellor Dashboard"}</h2>
          <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
          <button class="nav-btn" data-view="requests">📩 Appointments</button>
          <button class="nav-btn" data-view="sessions">📅 Sessions</button>
          <button class="nav-btn" data-view="availability">🕒 Availability</button>
          <button class="nav-btn" data-view="reports">🧾 Session Notes</button>
          <button class="nav-btn" data-view="videos">🎥 Resources</button>
          <button class="nav-btn" data-view="profile">👤 Profile</button>
        </div>
        <button id="logoutBtn">🚪 Logout</button>
      </div>

      <div class="content" id="mainContent">
        <div class="topbar">
          <div><span class="avail-indicator"></span>${
            counsellor.availableNow ? "Available Now" : "Offline"
          }</div>
          <button id="toggleAvail" class="action">Toggle Availability</button>
        </div>
        <div id="viewContainer"></div>
      </div>
    `;
    return root;
  };

  /* ------------------------------------------------------------
     4.  VIEWS
  ------------------------------------------------------------ */
  const VIEWS = {
    dashboard(c) {
      const wrap = el("div");
      wrap.append(
        el("div", { class: "card" }, [
          el("h3", {}, "Overview"),
          el("p", {}, `Welcome back, ${c.name || "Counsellor"}!`),
          el("p", {}, "Here’s a quick summary of your counselling activity."),
        ])
      );
      const stats = el("div", { class: "card" });
      const reqs = load("requests", []).filter((r) => r.counsellorId === c.id);
      const completed = reqs.filter((r) => r.status === "Completed");
      const ratings = load("ratings", []).filter((r) => r.counsellorId === c.id);
      const avg =
        ratings.length > 0
          ? (
              ratings.reduce((a, b) => a + (b.rating || 0), 0) / ratings.length
            ).toFixed(1)
          : "—";
      stats.innerHTML = `
        <div><b>Total Appointments:</b> ${reqs.length}</div>
        <div><b>Completed Sessions:</b> ${completed.length}</div>
        <div><b>Average Feedback:</b> ${avg} ★</div>
      `;
      wrap.append(stats);
      return wrap;
    },

    requests(c) {
      const box = el("div");
      const list = el("div");
      const refresh = async () => {
        const reqs = await mockAPI.fetchRequests(c.id);
        list.innerHTML = "";
        if (!reqs.length)
          return (list.textContent = "No counselling requests yet.");
        reqs.forEach((r) => {
          const card = el("div", { class: "card" });
          card.innerHTML = `
            <b>${r.studentName}</b> - ${r.reason}<br/>
            <small>${fmtDate(r.datetime)} | ${r.mode}</small><br/>
            <small>Status: ${r.status}</small>
          `;
          const btns = el("div");
          ["Approve", "Reject", "Suggest"].forEach((a) => {
            const b = el("button", { class: "action", style: { margin: "4px" } }, a);
            b.onclick = async () => {
              if (a === "Suggest") {
                const s = prompt("Suggest new time (YYYY-MM-DD HH:MM)");
                if (!s) return;
                await mockAPI.updateRequest(r.id, { status: "Suggested", suggestedTime: s });
              } else {
                await mockAPI.updateRequest(r.id, { status: a });
              }
              showToast(`Appointment ${a}`);
              refresh();
            };
            btns.append(b);
          });
          card.append(btns);
          list.append(card);
        });
      };
      refresh();
      box.append(list);
      return box;
    },

    sessions(c) {
      const list = el("div");
      const reqs = load("requests", []).filter(
        (r) => r.counsellorId === c.id && r.status === "Approved"
      );
      if (!reqs.length) list.textContent = "No upcoming sessions.";
      reqs.forEach((r) => {
        const card = el("div", { class: "card" });
        card.innerHTML = `<b>${r.studentName}</b> - ${r.reason}<br/>
                       ${fmtDate(r.datetime)} | ${r.mode}`;
        const btn = el("button", { class: "action", style: { marginTop: "8px" } }, "Open / Notes");
        btn.onclick = () => openReportModal(r, c);
        card.append(btn);
        list.append(card);
      });
      return list;
    },

    availability(c) {
      const wrap = el("div", { class: "card" });
      wrap.append(el("h3", {}, "Weekly Availability"));
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
      const data = c.schedule || {};
      days.forEach((d) => {
        const from = el("input", {
          type: "time",
          value: data[d]?.from || "",
        });
        const to = el("input", { type: "time", value: data[d]?.to || "" });
        const row = el("div", {}, [`${d}: `, from, "–", to]);
        wrap.append(row);
        from.onchange = to.onchange = () => {
          data[d] = { from: from.value, to: to.value };
          c.schedule = data;
          save("currentCounsellor", c);
        };
      });
      return wrap;
    },

    reports(c) {
      const reps = load("reports", []).filter((r) => r.counsellorId === c.id);
      const box = el("div");
      reps.reverse().forEach((r) => {
        const card = el("div", { class: "card" });
        card.innerHTML = `<b>Session:</b> ${r.studentName || ""}<br/>
                       <b>Topics:</b> ${r.topics || ""}<br/>
                       <b>Notes:</b> ${r.overview || ""}<br/>
                       <small>${fmtDate(r.date)}</small>`;
        box.append(card);
      });
      if (!reps.length) box.textContent = "No session notes yet.";
      return box;
    },

    videos(c) {
      const wrap = el("div");
      const vids = load("videos", []).filter((v) => v.counsellorId === c.id);
      const addBtn = el("button", { class: "action", style: { marginBottom: "12px" } }, "Upload Resource");
      addBtn.onclick = () => openVideoModal(c);
      wrap.append(addBtn);
      vids.reverse().forEach((v) => {
        const card = el("div", { class: "card" });
        card.innerHTML = `<b>${v.title}</b><br/><small>${v.desc}</small><br/>
          <video src="${v.url}" controls width="100%" style="margin-top:8px;border-radius:8px;"></video>`;
        wrap.append(card);
      });
      if (!vids.length) wrap.append(el("p", {}, "No resources uploaded yet."));
      return wrap;
    },

    profile(c) {
      const form = el("div", { class: "card" });
      form.append(el("h3", {}, "Edit Profile"));
      const name = el("input", { value: c.name || "", placeholder: "Name" });
      const email = el("input", { value: c.email || "", placeholder: "Email" });
      const bio = el("textarea", { placeholder: "Short bio" }, c.bio || "");
      const specialities = el("input", {
        value: c.specialities || "",
        placeholder: "Specialities (comma separated)",
      });
      const saveBtn = el("button", { class: "action" }, "Save");
      saveBtn.onclick = async () => {
        Object.assign(c, {
          name: name.value,
          email: email.value,
          bio: bio.value,
          specialities: specialities.value,
        });
        await mockAPI.registerCounsellor(c);
        save("currentCounsellor", c);
        showToast("Profile saved");
      };
      form.append(name, email, bio, specialities, saveBtn);
      return form;
    },
  };

  /* ------------------------------------------------------------
     5.  MODALS + TOASTS
  ------------------------------------------------------------ */
  function openReportModal(req, counsellor) {
    const overlay = el("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      },
    });
    const box = el("div", {
      style: {
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        width: "400px",
        maxWidth: "90%",
      },
    });
    const overview = el("textarea", {
      placeholder: "Session notes / observations",
    });
    const topics = el("textarea", {
      placeholder: "Discussion points / issues addressed",
    });
    const follow = el("input", {
      type: "datetime-local",
      placeholder: "Follow-up meeting time",
    });
    const submit = el("button", { class: "action" }, "Save Notes");
    submit.onclick = async () => {
      await mockAPI.submitReport({
        counsellorId: counsellor.id,
        requestId: req.id,
        studentName: req.studentName,
        overview: overview.value,
        topics: topics.value,
        followUp: follow.value,
        date: new Date().toISOString(),
      });
      showToast("Session notes saved");
      overlay.remove();
    };
    box.append(el("h3", {}, "Session Notes"), overview, topics, follow, submit);
    overlay.append(box);
    document.body.append(overlay);
  }

  function openVideoModal(counsellor) {
    const overlay = el("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      },
    });
    const box = el("div", {
      style: {
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        width: "400px",
        maxWidth: "90%",
      },
    });
    const title = el("input", { placeholder: "Resource title" });
    const desc = el("textarea", { placeholder: "Description" });
    const url = el("input", { placeholder: "Video / Resource URL" });
    const saveBtn = el("button", { class: "action" }, "Save Resource");
    saveBtn.onclick = async () => {
      await mockAPI.uploadVideo({
        counsellorId: counsellor.id,
        title: title.value,
        desc: desc.value,
        url: url.value,
        date: new Date().toISOString(),
      });
      showToast("Resource added");
      overlay.remove();
    };
    box.append(el("h3", {}, "Upload Resource"), title, desc, url, saveBtn);
    overlay.append(box);
    document.body.append(overlay);
  }

  function showToast(msg) {
    const t = el("div", { class: "toast" }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2500);
  }

  /* ------------------------------------------------------------
     6.  MAIN INITIALIZATION
  ------------------------------------------------------------ */
  async function init() {
    const uni = detectUni();
    const cont = qs(".portal-container") || document.body;
    const stored = load("currentCounsellor");
    let counsellor = stored;

    if (!counsellor) {
      // Mock login prompt
      const name = prompt("Enter your name to start:");
      const email = prompt("Enter email:");
      counsellor = { id: uid("counsellor-"), name, email, university: uni, availableNow: false };
      save("currentCounsellor", counsellor);
      await mockAPI.registerCounsellor(counsellor);
    }

    cont.innerHTML = "";
    const ui = buildUI(counsellor, uni);
    cont.append(ui);

    const content = ui.querySelector("#viewContainer");
    const navs = ui.querySelectorAll(".nav-btn");
    const renderView = (v) => {
      navs.forEach((n) => n.classList.toggle("active", n.dataset.view === v));
      content.innerHTML = "";
      content.append(VIEWS[v](counsellor));
    };
    renderView("dashboard");

    navs.forEach((n) => (n.onclick = () => renderView(n.dataset.view)));

    ui.querySelector("#toggleAvail").onclick = () => {
      counsellor.availableNow = !counsellor.availableNow;
      save("currentCounsellor", counsellor);
      showToast(`You are now ${counsellor.availableNow ? "Available" : "Offline"}`);
      init(); // reload UI
    };

    ui.querySelector("#logoutBtn").onclick = () => {
      localStorage.removeItem("currentCounsellor");
      location.reload();
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();


