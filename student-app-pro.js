/* ============================================================
   student-portal-pro.js
   Complete Student Portal Frontend + Mock Backend
   Version: 1.0 (Hybrid AI–Material Design)
   ------------------------------------------------------------
   NOTE: This file is adapted from tutor-app-pro.js and implements
   only STUDENT features (frontend + mock local backend).
   ============================================================ */

(function () {
  "use strict";

  const APP_KEY = "university_student_portal_v1";

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
    prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

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
     - Register/login students
     - Search tutors/counsellors (reads from stored 'tutors')
     - Create requests, fetch student requests
     - Notifications, ratings, history
  ------------------------------------------------------------ */
  const mockAPI = {
    async registerStudent(profile) {
      await delay(150);
      const students = load("students", {});
      profile.id = profile.id || uid("student-");
      students[profile.id] = profile;
      save("students", students);
      return { ok: true, student: profile };
    },

    async loginStudent({ email, studentNumber, password }) {
      await delay(150);
      const students = Object.values(load("students", {}));
      const found = students.find(
        (s) => s.email === email || s.studentNumber === studentNumber
      );
      if (found && (!password || password === found.password)) return { ok: true, student: found };
      return { ok: false, error: "Invalid credentials" };
    },

    async searchHelpers({ role = "tutor", query = "", module = "", type = "" } = {}) {
      await delay(120);
      // tutors/counsellors are stored under 'tutors' for compatibility with existing data
      const all = Object.values(load("tutors", {}));
      return all.filter((t) => {
        if (role && t.role && t.role !== role && !(role === "tutor" && !t.role)) return false;
        if (query && !t.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (module && !(t.modules || "").toLowerCase().includes(module.toLowerCase())) return false;
        if (type && t.type && t.type !== type) return false; // counsellor types
        return true;
      });
    },

    async sendRequest(request) {
      await delay(120);
      const reqs = load("requests", []);
      request.id = request.id || uid("req-");
      request.status = "Pending";
      request.createdAt = new Date().toISOString();
      reqs.push(request);
      save("requests", reqs);
      // add notification to tutor (mock)
      const notes = load("notifications", []);
      notes.push({ id: uid("n-"), to: request.tutorId, message: `New request from ${request.studentName}`, date: new Date().toISOString(), read: false });
      save("notifications", notes);
      return { ok: true, request };
    },

    async fetchStudentRequests(studentId) {
      await delay(120);
      const reqs = load("requests", []);
      return reqs.filter((r) => r.studentId === studentId).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
    },

    async fetchNotificationsForStudent(studentId) {
      await delay(80);
      const notes = load("notifications", []);
      // notifications saved both for tutors and students; messages that mention the student are for them
      return notes.filter((n) => n.to === studentId || n.forStudent === studentId);
    },

    async submitRating(data) {
      await delay(80);
      const ratings = load("ratings", []);
      ratings.push(data);
      save("ratings", ratings);
      return { ok: true };
    },

    async fetchHistory(studentId) {
      await delay(80);
      const reqs = load("requests", []);
      const reports = load("reports", []);
      return { requests: reqs.filter((r) => r.studentId === studentId), reports: reports.filter((r) => r.studentId === studentId) };
    },
  };

  /* ------------------------------------------------------------
     3.  DASHBOARD LAYOUT + DESIGN
  ------------------------------------------------------------ */
  const buildUI = (student, uni) => {
    const root = el("div", { class: "student-dashboard" });
    root.innerHTML = `
      <style>
        :root {
          --uj-main:#f36f21;
          --up-main:#004b8d;
          --wits-main:#002147;
          --accent:#e8b500;
        }
        .student-dashboard {
          width:100%;
          max-width:1200px;
          margin:30px auto;
          display:flex;
          border-radius:16px;
          overflow:hidden;
          background:rgba(255,255,255,0.9);
          backdrop-filter:blur(12px);
          box-shadow:0 10px 35px rgba(0,0,0,.14);
        }
        .side {
          width:260px;
          background:linear-gradient(180deg,var(--${uni}-main),#111);
          color:#fff;display:flex;flex-direction:column;justify-content:space-between;
        }
        .side h2 { padding:20px;text-align:center;font-size:1.15rem;border-bottom:1px solid rgba(255,255,255,.12); }
        .side button { background:none;border:none;color:#fff;padding:12px 18px;text-align:left;cursor:pointer;width:100%;font-size:15px;border-bottom:1px solid rgba(255,255,255,.06); }
        .side button:hover, .side button.active { background:rgba(255,255,255,0.08); }
        .content { flex:1;padding:22px 30px;overflow-y:auto;max-height:calc(100vh - 80px); }
        .card { background:#fff;border-radius:10px;box-shadow:0 3px 12px rgba(0,0,0,.06);padding:16px;margin-bottom:16px; }
        .topbar { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px; }
        input,textarea,select { width:100%;padding:8px 10px;margin:6px 0 12px 0;border-radius:6px;border:1px solid #ddd;font-size:14px; }
        button.action { padding:8px 12px;border-radius:6px;border:none;background:var(--${uni}-main);color:#fff;cursor:pointer; }
        .small { font-size:0.9rem;color:#666; }
        .helper-list { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .helper { padding:10px;border-radius:8px;border:1px solid #eee;background:#fafafa; }
        .toast { position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 20px;border-radius:6px;opacity:.96;z-index:9999; }
      </style>

      <div class="side">
        <div>
          <h2>${student?.name || 'Student Portal'}</h2>
          <button class="nav-btn active" data-view="search">🔎 Search Help</button>
          <button class="nav-btn" data-view="requests">📩 My Requests</button>
          <button class="nav-btn" data-view="sessions">📅 Active Sessions</button>
          <button class="nav-btn" data-view="notifications">🔔 Notifications</button>
          <button class="nav-btn" data-view="history">📚 History</button>
          <button class="nav-btn" data-view="profile">👤 Profile</button>
        </div>
        <div style="padding:12px;border-top:1px solid rgba(255,255,255,.06)">
          <button id="logoutBtn">🚪 Logout</button>
        </div>
      </div>

      <div class="content">
        <div class="topbar">
          <div>Welcome, <strong>${student.name || 'Student'}</strong></div>
          <div><button id="needNow" class="action">🚨 Need Help Now</button></div>
        </div>
        <div id="viewContainer"></div>
      </div>
    `;
    return root;
  };

  /* ------------------------------------------------------------
     4.  VIEWS (Student-focused)
  ------------------------------------------------------------ */
  const VIEWS = {
    async search(student) {
      const wrap = el('div');
      const card = el('div', { class: 'card' });
      card.append(el('h3', {}, 'Find a Tutor or Counsellor'));

      const roleSel = el('select', {}, [
        el('option', { value: 'tutor' }, 'Tutor'),
        el('option', { value: 'counsellor' }, 'Counsellor'),
      ]);
      const nameInput = el('input', { placeholder: 'Search by name' });
      const moduleInput = el('input', { placeholder: 'Module (e.g. ECO101)' });
      const typeSel = el('select', {}, [
        el('option', { value: '' }, 'Any service type'),
        el('option', { value: 'Personal' }, 'Personal'),
        el('option', { value: 'Academic' }, 'Academic'),
        el('option', { value: 'Mental' }, 'Mental'),
        el('option', { value: 'Financial' }, 'Financial'),
      ]);
      const searchBtn = el('button', { class: 'action' }, 'Search');

      const results = el('div', { style: { marginTop: '12px' } });

      const renderHelpers = (list) => {
        results.innerHTML = '';
        if (!list.length) return results.append(el('p', {}, 'No results found.'));
        const grid = el('div', { class: 'helper-list' });
        list.forEach(h => {
          const box = el('div', { class: 'helper' });
          box.innerHTML = `<b>${h.name}</b><br/><small class="small">${h.modules||''}</small><br/><small class="small">${h.bio||''}</small><br/>`;
          const reqBtn = el('button', { class: 'action', style: { marginTop: '8px' } }, 'Request Session');
          reqBtn.onclick = () => openRequestModal(student, h);
          box.append(reqBtn);
          grid.append(box);
        });
        results.append(grid);
      };

      searchBtn.onclick = async () => {
        const list = await mockAPI.searchHelpers({ role: roleSel.value, query: nameInput.value, module: moduleInput.value, type: typeSel.value });
        renderHelpers(list);
      };

      // recommended side list (first 6 tutors)
      const recommended = el('div', { class: 'card' });
      recommended.append(el('h4', {}, 'Recommended Helpers'));
      const recList = el('div');
      recommended.append(recList);
      (async () => {
        const all = await mockAPI.searchHelpers({ role: 'tutor' });
        const first = all.slice(0,6);
        recList.innerHTML = '';
        first.forEach(h => {
          const r = el('div', { style: { padding: '8px 0', borderBottom: '1px solid #eee' } }, [
            el('div', {}, `${h.name} — ${h.modules || ''}`),
            el('div', { style: { marginTop: '6px' } }, [
              el('button', { class: 'action' }, 'Request')
            ])
          ]);
          r.querySelector('button').onclick = () => openRequestModal(student, h);
          recList.append(r);
        });
      })();

      card.append(roleSel, nameInput, moduleInput, typeSel, searchBtn, results);
      wrap.append(card, recommended);
      return wrap;
    },

    async requests(student) {
      const wrap = el('div');
      const list = el('div');
      const refresh = async () => {
        const reqs = await mockAPI.fetchStudentRequests(student.id);
        list.innerHTML = '';
        if (!reqs.length) return list.append(el('p', {}, 'You have not sent any requests.'));
        reqs.forEach(r => {
          const c = el('div', { class: 'card' });
          c.innerHTML = `<b>${r.helperName}</b> — ${r.module || ''}<br/><small>${fmtDate(r.datetime)} | ${r.mode}</small><br/><small>Status: ${r.status}</small>`;
          // if Pending, allow cancel
          if (r.status === 'Pending') {
            const cancel = el('button', { class: 'action', style: { marginTop: '8px', background: '#999' } }, 'Cancel Request');
            cancel.onclick = async () => {
              const reqs = load('requests', []);
              const i = reqs.findIndex(x=> x.id === r.id);
              if (i>=0) { reqs.splice(i,1); save('requests', reqs); showToast('Request cancelled'); refresh(); }
            };
            c.append(cancel);
          }
          // if approved, show join
          if (r.status === 'Approved') {
            const join = el('button', { class: 'action', style: { marginTop: '8px' } }, 'Join Session');
            join.onclick = () => openJoinView(r);
            c.append(join);
          }
          list.append(c);
        });
      };
      refresh();
      wrap.append(list);
      return wrap;
    },

    async sessions(student) {
      const wrap = el('div');
      // Active sessions are approved requests
      const reqs = (await mockAPI.fetchStudentRequests(student.id)).filter(r => r.status === 'Approved');
      if (!reqs.length) wrap.append(el('p', {}, 'No active/approved sessions.'));
      reqs.forEach(r => {
        const c = el('div', { class: 'card' });
        c.innerHTML = `<b>${r.helperName}</b><br/>${fmtDate(r.datetime)} | ${r.mode}<br/><small>${r.location||r.link||''}</small>`;
        const join = el('button', { class: 'action', style: { marginTop: '8px' } }, 'Join Session');
        join.onclick = () => openJoinView(r);
        c.append(join);
        wrap.append(c);
      });
      return wrap;
    },

    async notifications(student) {
      const wrap = el('div');
      const notes = await mockAPI.fetchNotificationsForStudent(student.id);
      if (!notes.length) wrap.append(el('p', {}, 'No notifications.'));
      notes.forEach(n => {
        const c = el('div', { class: 'card' });
        c.innerHTML = `<div>${n.message || ''}</div><small class='small'>${fmtDate(n.date)}</small>`;
        wrap.append(c);
      });
      return wrap;
    },

    async history(student) {
      const wrap = el('div');
      const h = await mockAPI.fetchHistory(student.id);
      const reqs = h.requests || [];
      const reports = h.reports || [];
      const box = el('div', { class: 'card' });
      box.append(el('h3', {}, 'Past Sessions'));
      if (!reqs.length) box.append(el('p', {}, 'No past sessions.'));
      reqs.filter(r => r.status === 'Completed' || r.status === 'Declined' || r.status === 'Cancelled').forEach(r => {
        const c = el('div', { style: { padding: '8px 0', borderBottom: '1px solid #eee' } });
        c.innerHTML = `<b>${r.helperName}</b> — ${r.module||''}<br/><small>${fmtDate(r.datetime)} | ${r.status}</small>`;
        box.append(c);
      });
      const repBox = el('div', { class: 'card' });
      repBox.append(el('h3', {}, 'Reports from Helpers'));
      if (!reports.length) repBox.append(el('p', {}, 'No reports yet.'));
      reports.forEach(r => {
        const c = el('div', { style: { padding: '8px 0', borderBottom: '1px solid #eee' } });
        c.innerHTML = `<b>${r.helperName || ''}</b><br/><b>Topics:</b> ${r.topics||''}<br/><small>${fmtDate(r.date)}</small>`;
        repBox.append(c);
      });
      wrap.append(box, repBox);
      return wrap;
    },

    profile(student) {
      const form = el('div', { class: 'card' });
      form.append(el('h3', {}, 'Edit Profile'));
      const name = el('input', { value: student.name || '', placeholder: 'Full name' });
      const email = el('input', { value: student.email || '', placeholder: 'Email' });
      const sn = el('input', { value: student.studentNumber || '', placeholder: 'Student number' });
      const photo = el('input', { placeholder: 'Photo URL (optional)' });
      const saveBtn = el('button', { class: 'action' }, 'Save Profile');
      saveBtn.onclick = async () => {
        Object.assign(student, { name: name.value, email: email.value, studentNumber: sn.value, photo: photo.value });
        await mockAPI.registerStudent(student);
        save('currentStudent', student);
        showToast('Profile saved');
      };
      form.append(name, email, sn, photo, saveBtn);
      return form;
    }
  };

  /* ------------------------------------------------------------
     5.  MODALS + HELPERS
  ------------------------------------------------------------ */
  function openRequestModal(student, helper) {
    const overlay = el('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 } });
    const box = el('div', { style: { background: '#fff', padding: '18px', borderRadius: '10px', width: '420px', maxWidth: '94%' } });
    const datetime = el('input', { type: 'datetime-local' });
    const mode = el('select', {}, [ el('option', { value: 'Online' }, 'Online'), el('option', { value: 'In-Person' }, 'In-Person') ]);
    const module = el('input', { placeholder: 'Module (optional)' });
    const msg = el('textarea', { placeholder: 'Optional message to the helper' });
    const send = el('button', { class: 'action' }, 'Send Request');
    send.onclick = async () => {
      const req = {
        studentId: student.id,
        studentName: student.name,
        tutorId: helper.id,
        helperId: helper.id,
        helperName: helper.name,
        module: module.value,
        datetime: datetime.value || new Date().toISOString(),
        mode: mode.value,
        message: msg.value,
        status: 'Pending'
      };
      await mockAPI.sendRequest(req);
      showToast('Request sent');
      overlay.remove();
    };
    box.append(el('h3', {}, `Request: ${helper.name}`), module, datetime, mode, msg, send);
    overlay.append(box);
    document.body.append(overlay);
  }

  function openJoinView(request) {
    const overlay = el('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 } });
    const box = el('div', { style: { background: '#fff', padding: '18px', borderRadius: '10px', width: '420px', maxWidth: '94%' } });
    const info = el('div', {}, [`<b>${request.helperName}</b><br/>${fmtDate(request.datetime)}<br/>${request.mode}<br/>`]);
    const joinBtn = el('button', { class: 'action' }, 'Open Meeting Link');
    joinBtn.onclick = () => {
      if (request.link) window.open(request.link, '_blank');
      else showToast('No meeting link available — contact helper');
    };
    const rateBtn = el('button', { class: 'action', style: { marginLeft: '8px' } }, 'Rate Session');
    rateBtn.onclick = () => { overlay.remove(); openRatingModal(request); };
    box.append(el('h3', {}, 'Session Details'), info, joinBtn, rateBtn);
    overlay.append(box);
    document.body.append(overlay);
  }

  function openRatingModal(request) {
    const overlay = el('div', { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 } });
    const box = el('div', { style: { background: '#fff', padding: '18px', borderRadius: '10px', width: '420px', maxWidth: '94%' } });
    const stars = el('input', { type: 'number', placeholder: 'Rating (1-5)', min: 1, max: 5 });
    const comment = el('textarea', { placeholder: 'Leave a comment' });
    const submit = el('button', { class: 'action' }, 'Submit Rating');
    submit.onclick = async () => {
      await mockAPI.submitRating({ studentId: request.studentId, tutorId: request.tutorId, rating: Number(stars.value) || 5, comment: comment.value, date: new Date().toISOString() });
      showToast('Thanks for rating');
      overlay.remove();
    };
    box.append(el('h3', {}, 'Rate the Session'), stars, comment, submit);
    overlay.append(box);
    document.body.append(overlay);
  }

  function showToast(msg) {
    const t = el('div', { class: 'toast' }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2400);
  }

  /* ------------------------------------------------------------
     6.  MAIN INITIALIZATION
  ------------------------------------------------------------ */
  async function init() {
    const uni = detectUni();
    const cont = qs('.portal-container') || document.body;
    let student = load('currentStudent');

    if (!student) {
      // Minimal mock sign-up/login flow (non-blocking prompts)
      const name = prompt('Enter your full name to start (or cancel to use demo):');
      const email = prompt('Enter email (or leave blank):');
      if (name) {
        student = { id: uid('student-'), name, email, university: uni };
        save('currentStudent', student);
        await mockAPI.registerStudent(student);
      } else {
        // demo student
        student = { id: uid('student-'), name: 'Demo Student', email: '', university: uni };
        save('currentStudent', student);
        await mockAPI.registerStudent(student);
      }
    }

    cont.innerHTML = '';
    const ui = buildUI(student, uni);
    cont.append(ui);

    const content = ui.querySelector('#viewContainer');
    const navs = ui.querySelectorAll('.nav-btn');

    const renderView = async (v) => {
      navs.forEach((n) => n.classList.toggle('active', n.dataset.view === v));
      content.innerHTML = '';
      const view = await VIEWS[v](student);
      content.append(view);
    };

    renderView('search');
    navs.forEach((n) => (n.onclick = () => renderView(n.dataset.view)));

    ui.querySelector('#needNow').onclick = async () => {
      // find first available helper (tutor) and send an immediate request
      const helpers = await mockAPI.searchHelpers({ role: 'tutor' });
      const available = helpers.find(h => h.availableNow);
      if (!available) return showToast('No helpers available right now.');
      const req = {
        studentId: student.id,
        studentName: student.name,
        tutorId: available.id,
        helperId: available.id,
        helperName: available.name,
        module: '',
        datetime: new Date().toISOString(),
        mode: 'Online',
        message: 'Need help now',
        status: 'Pending'
      };
      await mockAPI.sendRequest(req);
      showToast('Immediate request sent');
    };

    ui.querySelector('#logoutBtn').onclick = () => { localStorage.removeItem('currentStudent'); location.reload(); };

  }

  document.addEventListener('DOMContentLoaded', init);
})();


