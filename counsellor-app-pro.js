/* ============================================================
   counselling-app-pro-enhanced.js
   Complete Counsellor & Tutor Portal Frontend + Mock Backend
   Version: 1.1 (Hybrid AI–Material Design + Mock Integrations)
   - Preserves original structure & functions.
   - Adds 🧑‍⚕️ Counsellor features + tutor enhancements:
     • Profile photo, qualifications, offered services
     • Anonymous student requests
     • Calendar view of booked sessions
     • Join/Host online sessions (simulated Zoom/Teams/Meet links)
     • Automatic reminders (mocked)
     • Enhanced reports (private flag for admin)
     • Upload & record lesson/counselling videos (simulated)
     • Follow-up scheduling and linking reports -> follow-up
   ============================================================ */

(function () {
  "use strict";

  const APP_KEY = "university_counselling_portal_v1";

  /* ------------------------------------------------------------
     1.  UTILITIES (unchanged + few helpers)
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

  const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

  const detectUni = () => {
    const p = location.pathname.toLowerCase();
    if (p.includes("uj")) return "uj";
    if (p.includes("wits")) return "wits";
    return "up";
  };

  const isAdmin = () => {
    // very simple: if url contains 'admin' treat as admin user for visibility checks
    return location.pathname.toLowerCase().includes("admin");
  };

  /* ------------------------------------------------------------
     2.  ENHANCED MOCK BACKEND  (Local Only)
        - Simulates meeting links, reminders, calendar entries
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

    async createRequest(request) {
      await delay(150);
      const reqs = load("requests", []);
      request.id = request.id || uid("req-");
      request.status = request.status || "Pending";
      request.anonymous = !!request.anonymous;
      reqs.push(request);
      save("requests", reqs);
      // schedule reminder if requested (mock)
      if (request.remind) {
        scheduleMockReminder(request);
      }
      return { ok: true, request };
    },

    async updateRequest(id, patch) {
      const reqs = load("requests", []);
      const i = reqs.findIndex((r) => r.id === id);
      if (i < 0) return { ok: false };
      reqs[i] = { ...reqs[i], ...patch };
      save("requests", reqs);
      // on approve, create calendar entry
      if (patch.status && patch.status === "Approved") {
        createCalendarEntry(reqs[i]);
        // make simulated join links
        reqs[i].joinLinks = createMockMeetingLinks(reqs[i]);
        save("requests", reqs); // persist joinLinks
      }
      return { ok: true, request: reqs[i] };
    },

    async submitReport(data) {
      const reports = load("reports", []);
      data.id = data.id || uid("rep-");
      reports.push(data);
      save("reports", reports);
      // attach to student record if wanted
      if (data.followUp && data.followUp !== "") {
        // create a follow-up request that's linked
        const followReq = {
          id: uid("req-"),
          counsellorId: data.counsellorId,
          studentId: data.studentId,
          studentName: data.studentName,
          reason: "Follow-up",
          datetime: data.followUp,
          mode: "Online",
          status: "Approved",
          linkedReport: data.id,
        };
        const reqs = load("requests", []);
        reqs.push(followReq);
        save("requests", reqs);
        // calendar
        createCalendarEntry(followReq);
      }
      return { ok: true };
    },

    async uploadVideo(video) {
      const vids = load("videos", []);
      video.id = uid("vid-");
      vids.push(video);
      save("videos", vids);
      return { ok: true, video };
    },

    async fetchRatings(counsellorId) {
      const rs = load("ratings", []);
      return rs.filter((r) => r.counsellorId === counsellorId);
    },

    async fetchCalendar(counsellorId) {
      const cal = load("calendar", []);
      return cal.filter((e) => e.counsellorId === counsellorId);
    },

    async fetchAllRequestsAdmin() {
      // For admin visibility: return all requests, including private flags
      return load("requests", []);
    },
  };

  /* --------------- Helper functions for mock backend ------------- */
  function createMockMeetingLinks(req) {
    // generate simulated links for Zoom/Teams/Meet
    const base = "https://meet.mock/";
    return {
      zoom: `${base}zoom/${uid("z-")}`,
      teams: `${base}teams/${uid("t-")}`,
      meet: `${base}meet/${uid("g-")}`,
      preferred: "zoom",
    };
  }

  function createCalendarEntry(req) {
    const cal = load("calendar", []);
    const entry = {
      id: uid("cal-"),
      counsellorId: req.counsellorId,
      title: `${req.studentName || "Student"} — ${req.reason || "Session"}`,
      start: req.datetime,
      mode: req.mode || "Online",
      requestId: req.id,
      createdAt: new Date().toISOString(),
    };
    cal.push(entry);
    save("calendar", cal);
    // schedule a mock reminder
    scheduleMockReminder(req);
  }

  function scheduleMockReminder(req) {
    // This is mock: store reminders in localStorage. No background timer after page closed.
    const reminders = load("reminders", []);
    const r = {
      id: uid("rem-"),
      requestId: req.id,
      counsellorId: req.counsellorId,
      when: req.datetime,
      createdAt: new Date().toISOString(),
      sent: false,
    };
    reminders.push(r);
    save("reminders", reminders);
  }

  /* ------------------------------------------------------------
     3.  DASHBOARD LAYOUT + DESIGN (extended UI + style additions)
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
          background:rgba(255,255,255,0.9);
          backdrop-filter:blur(18px);
          box-shadow:0 10px 35px rgba(0,0,0,.18);
          font-family:system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        }
        .side {
          width:270px;
          background:linear-gradient(180deg,var(--${uni}-main),#222);
          color:#fff;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .side h2 {
          padding:20px;
          text-align:center;
          font-size:1.15rem;
          border-bottom:1px solid rgba(255,255,255,.12);
        }
        .profile-photo {
          width:90px;height:90px;border-radius:50%;background:#fff;margin:12px auto;object-fit:cover;
        }
        .side button {
          background:none;
          border:none;
          color:#fff;
          padding:12px 18px;
          text-align:left;
          cursor:pointer;
          width:100%;
          font-size:15px;
          border-bottom:1px solid rgba(255,255,255,.06);
        }
        .side button:hover, .side button.active {
          background:rgba(255,255,255,0.08);
        }
        .content {
          flex:1;
          padding:22px 28px;
          overflow-y:auto;
          max-height:calc(100vh - 100px);
        }
        .card {
          background:#fff;
          border-radius:12px;
          box-shadow:0 3px 12px rgba(0,0,0,.06);
          padding:18px;
          margin-bottom:18px;
          transition:transform .18s;
        }
        .card:hover { transform:translateY(-2px); }
        .topbar {
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:12px;
        }
        .avail-indicator {
          width:14px;height:14px;border-radius:50%;
          margin-right:8px;display:inline-block;
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
        .small {
          font-size:13px;color:#666;
        }
        .toast {
          position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
          background:#222;color:#fff;padding:10px 20px;border-radius:6px;
          opacity:.98;z-index:9999;transition:opacity .3s;
        }
        .calendar-grid {
          display:grid;
          grid-template-columns:repeat(7,1fr);
          gap:8px;
        }
        .cal-cell {
          border:1px dashed #ddd;padding:10px;border-radius:8px;background:#fafafa;
        }
        .link-pill { display:inline-block;padding:6px 8px;border-radius:6px;border:1px solid #eee;margin:4px 4px 0 0;font-size:13px; }
        .muted { color:#666; font-size:13px; }
      </style>

      <div class="side">
        <div>
          <h2>${counsellor?.name || "Counsellor Dashboard"}</h2>
          <div style="text-align:center;padding:6px 0;">
            <img src="${counsellor.photo || ''}" class="profile-photo" onerror="this.style.display='none'"/>
            ${!counsellor.photo ? `<div class="muted small">No photo set</div>` : ""}
          </div>
          <button class="nav-btn active" data-view="dashboard">🏠 Dashboard</button>
          <button class="nav-btn" data-view="requests">📩 Appointments</button>
          <button class="nav-btn" data-view="sessions">📅 Sessions</button>
          <button class="nav-btn" data-view="calendar">🗓️ Calendar</button>
          <button class="nav-btn" data-view="availability">🕒 Availability</button>
          <button class="nav-btn" data-view="reports">🧾 Session Notes</button>
          <button class="nav-btn" data-view="videos">🎥 Resources</button>
          <button class="nav-btn" data-view="profile">👤 Profile</button>
        </div>
        <div>
          <button id="toggleAvail" class="action" style="margin:10px;width:90%;margin-left:12px;">${
            counsellor.availableNow ? "Go Offline" : "Set Available Now"
          }</button>
          <button id="logoutBtn" style="background:none;border:none;color:#fff;padding:14px 20px;width:100%;text-align:left;">🚪 Logout</button>
        </div>
      </div>

      <div class="content" id="mainContent">
        <div class="topbar">
          <div><span class="avail-indicator"></span>${
            counsellor.availableNow ? "Available Now" : "Offline"
          }</div>
          <div>
            <span class="small muted">University:</span> <b>${counsellor.university || uni}</b>
          </div>
        </div>
        <div id="viewContainer"></div>
      </div>
    `;
    return root;
  };

  /* ------------------------------------------------------------
     4.  VIEWS (Extended: calendar, join/host, anonymous option)
  ------------------------------------------------------------ */
  const VIEWS = {
    dashboard(c) {
      const wrap = el("div");
      wrap.append(
        el("div", { class: "card" }, [
          el("h3", {}, "Overview"),
          el("p", {}, `Welcome back, ${c.name || "Counsellor"}!`),
          el("p", { class: "small" }, "Quick summary and actions below."),
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
        <div style="margin-top:10px;">
          <button id="quickRequestBtn" class="action">Create Mock Request (Test)</button>
          <button id="viewCalendarBtn" class="action" style="margin-left:8px;background:#666;">Open Calendar</button>
        </div>
      `;
      wrap.append(stats);

      // quick helpers
      setTimeout(() => {
        const qb = qs("#quickRequestBtn");
        if (qb) {
          qb.onclick = async () => {
            // create a mock request (random student)
            const req = {
              counsellorId: c.id,
              studentName: "Student " + Math.floor(Math.random() * 100),
              studentId: uid("stu-"),
              reason: "Wellbeing check",
              datetime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
              mode: "Online",
              anonymous: Math.random() > 0.5,
              remind: true,
            };
            await mockAPI.createRequest(req);
            showToast("Mock request created");
          };
        }
        const vc = qs("#viewCalendarBtn");
        if (vc) vc.onclick = () => renderView("calendar");
      }, 100);

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
        reqs
          .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
          .forEach((r) => {
            const card = el("div", { class: "card" });
            const studName = r.anonymous ? "Anonymous Student" : r.studentName || "Student";
            card.innerHTML = `
              <b>${studName}</b> - ${r.reason || "—"}<br/>
              <small>${fmtDate(r.datetime)} | ${r.mode}</small><br/>
              <small>Status: ${r.status}</small>
            `;
            const btns = el("div");
            ["Approve", "Reject", "Suggest", "Join"].forEach((a) => {
              const b = el("button", { class: "action", style: { margin: "6px 6px 6px 0" } }, a);
              b.onclick = async () => {
                if (a === "Suggest") {
                  const s = prompt("Suggest new time (YYYY-MM-DD HH:MM)");
                  if (!s) return;
                  await mockAPI.updateRequest(r.id, { status: "Suggested", suggestedTime: s });
                } else if (a === "Approve") {
                  await mockAPI.updateRequest(r.id, { status: "Approved" });
                } else if (a === "Reject") {
                  await mockAPI.updateRequest(r.id, { status: "Rejected" });
                } else if (a === "Join") {
                  // open join dialog with meeting links
                  openJoinDialog(r, c);
                }
                showToast(`Appointment ${a}`);
                refresh();
              };
              btns.append(b);
            });
            // quick preview link to student profile if not anonymous
            if (!r.anonymous && r.studentId) {
              const prof = el("button", { class: "action", style: { marginLeft: "8px", background: "#888" } }, "Student Profile");
              prof.onclick = () => alert(`Open student profile: ${r.studentId}\n(placeholder)`);
              btns.append(prof);
            }
            card.append(btns);
            list.append(card);
          });
      };
      refresh();
      box.append(list);

      // form to create new request (simulate student)
      const form = el("div", { class: "card" });
      form.append(el("h4", {}, "Simulate Student Request"));
      const sname = el("input", { placeholder: "Student name (leave blank for anonymous)" });
      const reason = el("input", { placeholder: "Reason (e.g., Anxiety, Counselling)" });
      const dt = el("input", { type: "datetime-local" });
      const mode = el("select");
      mode.append(el("option", { value: "Online" }, "Online"), el("option", { value: "In-person" }, "In-person"));
      const anon = el("label", {}, [
        el("input", { type: "checkbox" }),
        " Submit anonymously",
      ]);
      const submit = el("button", { class: "action" }, "Submit Request");
      submit.onclick = async () => {
        const req = {
          counsellorId: c.id,
          studentName: sname.value || "Anonymous",
          studentId: uid("stu-"),
          reason: reason.value || "Counselling",
          datetime: dt.value ? new Date(dt.value).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString(),
          mode: mode.value,
          anonymous: anon.querySelector("input").checked,
          remind: true,
        };
        await mockAPI.createRequest(req);
        showToast("Request submitted");
        refresh();
      };
      form.append(sname, reason, dt, mode, anon, submit);
      box.append(form);

      return box;
    },

    sessions(c) {
      const list = el("div");
      const reqs = load("requests", []).filter(
        (r) => r.counsellorId === c.id && (r.status === "Approved" || r.status === "In-Session")
      );
      if (!reqs.length) list.textContent = "No upcoming sessions.";
      reqs.forEach((r) => {
        const card = el("div", { class: "card" });
        const studName = r.anonymous ? "Anonymous Student" : r.studentName || "Student";
        card.innerHTML = `<b>${studName}</b> - ${r.reason}<br/>
                       ${fmtDate(r.datetime)} | ${r.mode}<br/>
                       <small>Status: ${r.status}</small>`;
        const btnHost = el("button", { class: "action", style: { marginTop: "8px" } }, "Join / Host Online");
        btnHost.onclick = () => openJoinDialog(r, c);
        const btnNotes = el("button", { class: "action", style: { marginLeft: "8px", marginTop: "8px" } }, "Submit Report");
        btnNotes.onclick = () => openReportModal(r, c);
        card.append(btnHost, btnNotes);
        list.append(card);
      });
      return list;
    },

    calendar(c) {
      const wrap = el("div");
      const card = el("div", { class: "card" });
      card.append(el("h3", {}, "Weekly Calendar (simulated)"));
      const grid = el("div", { class: "calendar-grid" });
      // load calendar entries for this counsellor
      const cal = load("calendar", []).filter((e) => e.counsellorId === c.id);
      // build 7 placeholders (Mon-Sun)
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.forEach((d) => {
        const cell = el("div", { class: "cal-cell" });
        const items = cal.filter((ev) => {
          // match weekday
          const dt = new Date(ev.start || ev.createdAt || Date.now());
          return dt.getDay() === days.indexOf(d);
        });
        cell.append(el("b", {}, d));
        if (!items.length) cell.append(el("div", { class: "small muted" }, "No events"));
        items.forEach((it) => {
          const e = el("div", {}, [
            el("div", { style: { marginTop: "8px" } }, `${new Date(it.start).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })} — ${it.title || ''}`),
            el("div", { class: "small" }, `${it.mode} | ${fmtDate(it.start)}`),
            el("div", {}, [
              el("button", { class: "action", style: { marginTop: "6px" } }, "Open"),
            ]),
          ]);
          e.querySelector("button").onclick = async () => {
            const req = load("requests", []).find((r) => r.id === it.requestId);
            if (req) openJoinDialog(req, c);
            else alert("Event not linked to request.");
          };
          cell.append(e);
        });
        grid.append(cell);
      });
      card.append(grid);
      wrap.append(card);
      return wrap;
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
      // quick "available now" toggle
      const toggle = el("button", { class: "action" }, c.availableNow ? "Go Offline" : "Set Available Now");
      toggle.onclick = () => {
        c.availableNow = !c.availableNow;
        save("currentCounsellor", c);
        showToast(`You are now ${c.availableNow ? "Available" : "Offline"}`);
        init(); // reload UI
      };
      wrap.append(toggle);
      return wrap;
    },

    reports(c) {
      const reps = load("reports", []).filter((r) => r.counsellorId === c.id);
      const box = el("div");
      reps.reverse().forEach((r) => {
        const card = el("div", { class: "card" });
        // Respect private flag: if private and not admin, don't show content except basic meta
        const privateVisible = !(r.private && !isAdmin());
        card.innerHTML = `<b>Session:</b> ${r.studentName || ""}<br/>
                       <b>Topics:</b> ${r.topics || ""}<br/>
                       <b>Notes:</b> ${privateVisible ? r.overview || "" : "[Private]" }<br/>
                       <small>${fmtDate(r.date)}</small>`;
        if (r.followUp) {
          const f = el("div", { class: "small" }, `Follow-up: ${fmtDate(r.followUp)}`);
          card.append(f);
        }
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
      const recordBtn = el("button", { class: "action", style: { marginLeft: "8px", background: "#666" } }, "Record Quick Clip (Sim)");
      recordBtn.onclick = async () => {
        // simulate a recorded clip by creating a mock URL
        const url = `https://media.mock/recording/${uid("rec-")}.mp4`;
        await mockAPI.uploadVideo({
          counsellorId: c.id,
          title: "Recorded clip " + new Date().toLocaleString(),
          desc: "Auto-recorded clip (simulated)",
          url,
          date: new Date().toISOString(),
        });
        showToast("Recorded clip saved (simulated)");
        init(); // reload
      };
      wrap.append(addBtn, recordBtn);
      vids.reverse().forEach((v) => {
        const card = el("div", { class: "card" });
        card.innerHTML = `<b>${v.title}</b><br/><small>${v.desc}</small><br/>
          <video src="${v.url}" controls width="100%" style="margin-top:8px;border-radius:8px;"></video>
          <div class="small muted">Uploaded: ${fmtDate(v.date)}</div>`;
        wrap.append(card);
      });
      if (!vids.length) wrap.append(el("p", {}, "No resources uploaded yet."));
      return wrap;
    },

    profile(c) {
      const form = el("div", { class: "card" });
      form.append(el("h3", {}, "Edit Profile / Counsellor & Tutor Features"));
      const photoPreview = el("img", { class: "profile-photo", src: c.photo || "", style: { display: c.photo ? "block" : "none" } });
      const photo = el("input", { placeholder: "Photo URL" });
      photo.onchange = () => {
        photoPreview.src = photo.value;
        photoPreview.style.display = photo.value ? "block" : "none";
      };
      const name = el("input", { value: c.name || "", placeholder: "Name" });
      const email = el("input", { value: c.email || "", placeholder: "Email" });
      const qualifications = el("input", { value: c.qualifications || "", placeholder: "Qualifications (comma separated)" });
      const services = el("input", { value: c.services || "", placeholder: "Services offered (mental health, personal, financial, academic)" });
      const bio = el("textarea", { placeholder: "Short bio" }, c.bio || "");
      const specialities = el("input", {
        value: c.specialities || "",
        placeholder: "Specialities (comma separated)",
      });
      const availabilityNow = el("label", {}, [
        el("input", { type: "checkbox", checked: !!c.availableNow }),
        " Available now"
      ]);
      const saveBtn = el("button", { class: "action" }, "Save");
      saveBtn.onclick = async () => {
        Object.assign(c, {
          photo: photo.value || c.photo,
          name: name.value,
          email: email.value,
          qualifications: qualifications.value,
          services: services.value,
          bio: bio.value,
          specialities: specialities.value,
          availableNow: availabilityNow.querySelector("input").checked,
        });
        await mockAPI.registerCounsellor(c);
        save("currentCounsellor", c);
        showToast("Profile saved");
        init();
      };
      form.append(photoPreview, photo, name, email, qualifications, services, bio, specialities, availabilityNow, saveBtn);
      return form;
    },
  };

  /* ------------------------------------------------------------
     5.  MODALS + TOASTS + JOIN DIALOG
  ------------------------------------------------------------ */
  function openReportModal(req, counsellor) {
    const overlay = el("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
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
        width: "520px",
        maxWidth: "95%",
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
    const privateFlag = el("label", {}, [
      el("input", { type: "checkbox" }),
      " Mark as private (only admin can view)"
    ]);
    const submit = el("button", { class: "action" }, "Save Notes");
    submit.onclick = async () => {
      await mockAPI.submitReport({
        id: uid("rep-"),
        counsellorId: counsellor.id,
        requestId: req.id,
        studentId: req.studentId,
        studentName: req.studentName,
        overview: overview.value,
        topics: topics.value,
        followUp: follow.value ? new Date(follow.value).toISOString() : null,
        date: new Date().toISOString(),
        private: privateFlag.querySelector("input").checked,
      });
      showToast("Session notes saved");
      overlay.remove();
    };
    box.append(el("h3", {}, "Session Notes"), overview, topics, follow, privateFlag, submit);
    overlay.append(box);
    document.body.append(overlay);
  }

  function openVideoModal(counsellor) {
    const overlay = el("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
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
        width: "480px",
        maxWidth: "95%",
      },
    });
    const title = el("input", { placeholder: "Resource title" });
    const desc = el("textarea", { placeholder: "Description" });
    const url = el("input", { placeholder: "Video / Resource URL (or YouTube link)" });
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
      init();
    };
    box.append(el("h3", {}, "Upload Resource"), title, desc, url, saveBtn);
    overlay.append(box);
    document.body.append(overlay);
  }

  function openJoinDialog(req, counsellor) {
    const overlay = el("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      },
    });
    const box = el("div", {
      style: {
        background: "#fff",
        padding: "18px",
        borderRadius: "10px",
        width: "520px",
        maxWidth: "95%",
      },
    });
    const links = req.joinLinks || createMockMeetingLinks(req);
    const title = el("h3", {}, `Session: ${req.studentName || "Student"} — ${req.reason || ""}`);
    const info = el("div", {}, [
      el("div", { class: "small muted" }, `Time: ${fmtDate(req.datetime)}`),
      el("div", { class: "small muted" }, `Mode: ${req.mode || "Online"}`),
    ]);
    const linkList = el("div", { style: { marginTop: "12px" } });
    const zoom = el("div", { class: "link-pill" }, `Zoom: ${links.zoom}`);
    const teams = el("div", { class: "link-pill" }, `Teams: ${links.teams}`);
    const meet = el("div", { class: "link-pill" }, `Meet: ${links.meet}`);
    linkList.append(zoom, teams, meet);
    const openButtons = el("div", { style: { marginTop: "12px" } });
    const openZoom = el("button", { class: "action" }, "Open Zoom Link");
    openZoom.onclick = () => {
      window.open(links.zoom, "_blank");
      showToast("Opened Zoom (simulated)");
    };
    const openTeams = el("button", { class: "action", style: { marginLeft: "8px", background: "#2f6f90" } }, "Open Teams");
    openTeams.onclick = () => {
      window.open(links.teams, "_blank");
      showToast("Opened Teams (simulated)");
    };
    const openMeet = el("button", { class: "action", style: { marginLeft: "8px", background: "#3aa1f2" } }, "Open Meet");
    openMeet.onclick = () => {
      window.open(links.meet, "_blank");
      showToast("Opened Meet (simulated)");
    };
    // Host / Start Session simulation
    const hostBtn = el("button", { class: "action", style: { marginTop: "12px", background: "#0a7d3a" } }, "Start Session (Host)");
    hostBtn.onclick = async () => {
      // mark request as In-Session
      await mockAPI.updateRequest(req.id, { status: "In-Session" });
      showToast("Session started (simulated)");
      overlay.remove();
      init();
    };
    // Join as participant
    const joinBtn = el("button", { class: "action", style: { marginTop: "12px", marginLeft: "8px", background: "#444" } }, "Join as Participant");
    joinBtn.onclick = async () => {
      await mockAPI.updateRequest(req.id, { status: "In-Session" });
      showToast("You joined the session (simulated)");
      overlay.remove();
      init();
    };

    box.append(title, info, linkList, openButtons);
    openButtons.append(openZoom, openTeams, openMeet, hostBtn, joinBtn);
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
    let counsellor = stored || {};   // keep stored data if any, otherwise new object
    counsellor.university = detectUni(); // **force current portal’s university**

    if (!counsellor) {
      // Improved mock login prompt (keeps parity with your earlier flow)
      const name = prompt("Enter your name to start:");
      const email = prompt("Enter email:");
      counsellor = {
        id: uid("counsellor-"),
        name,
        email,
        university: uni,
        availableNow: false,
        photo: "",
        qualifications: "",
        services: "",
      };
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

    // Check and display pending reminders (mocked)
    showPendingRemindersFor(counsellor.id);
  }

  /* ------------------------------------------------------------
     7.  REMINDERS CHECK (mocked, shows local reminders for today)
  ------------------------------------------------------------ */
  function showPendingRemindersFor(counsellorId) {
    const reminders = (load("reminders", []) || []).filter((r) => r.counsellorId === counsellorId && !r.sent);
    if (!reminders.length) return;
    const upcoming = reminders.filter((r) => new Date(r.when) - Date.now() < 1000 * 60 * 60 * 24); // next 24h
    upcoming.forEach((r) => {
      showToast(`Reminder: You have a session soon (${fmtDate(r.when)})`);
      // mark as "sent" in this mock environment
      r.sent = true;
    });
    // save updated reminders back (mark sent)
    const all = load("reminders", []);
    const merged = all.map((a) => {
      const found = upcoming.find((u) => u.id === a.id);
      return found ? found : a;
    });
    save("reminders", merged);
  }

  /* ------------------------------------------------------------
     8.  BOOT
  ------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", init);
})();



