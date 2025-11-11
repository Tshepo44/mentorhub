/*
app.js
Student-facing frontend logic — ready for UJ, UP, WITS student pages.

HOW THIS FILE IS STRUCTURED
1) Integration instructions (README-style) — follow these steps to add app.js to your GitHub project.
2) High-level notes & integration points for backend (where to plug APIs later).
3) The full JavaScript implementation which:
   - Provides local (frontend-only) Create Profile / Login (localStorage)
   - Allows editing profile and uploading photo (dataURL saved to localStorage)
   - Replaces the central "Welcome" area on each *student* page with a fully functional student dashboard (no changes to top-left logo or background image)
   - Implements search UI (by name, module, service type) using a mock dataset per university
   - Lets student "Request Session" (schedule time, online/in-person, or Need Help Now)
   - Shows a Requests dashboard (Pending, Approved, Declined)
   - Notifications (in-site) and skeleton for email notifications (integration comments)
   - Session join details, rating, comments, history

IMPORTANT
- This script adds UI elements dynamically; it does not modify any static assets (logos/backgrounds) or your HTML files. It respects the placement of the top-left logo and background image.
- It assumes your student pages are named something like: uj-student.html, up-student.html, wits-student.html OR contain "-student" in the filename. If your filenames differ, update the isStudentPage() helper.
- For production: remove localStorage usage and replace calls to `fakeServer.*` functions with real fetch()/axios calls to your backend endpoints.

GITHUB / DEPLOY STEPS (every single step)
1) Save this file as `app.js` in your project root (same level as index.html and style.css).
2) Add <script src="./app.js" defer></script> to the bottom of each student HTML file (just before </body>) OR add it once to index.html if you use shared header/footer. Example:
   <script src="app.js" defer></script>
   (You said don't change other files — so if you prefer, create the script tag locally when you test in browser devtools.)
3) Commit and push to GitHub:
   git add app.js
   git commit -m "Add student frontend logic (profile, search, requests)"
   git push
4) Test in browser by opening each student page (e.g., uj-student.html). The central welcome should be replaced by the dashboard after you click "Open Student Dashboard" button that appears automatically when on student pages.

BACKEND INTEGRATION POINTS (where to plug real APIs later)
- fakeServer.login(profile)    ->   POST /api/auth/login or /api/student/login
- fakeServer.register(profile) ->   POST /api/students
- fakeServer.searchProviders(filter) -> GET /api/providers?module=...&type=...
- fakeServer.createRequest(request) -> POST /api/requests
- fakeServer.fetchRequests(studentId) -> GET /api/students/:id/requests
- fakeServer.updateRequestStatus(requestId, status) -> PATCH /api/requests/:id
- fakeServer.sendNotification(notification) -> POST /api/notifications or mail service

When you implement real endpoints, replace the `fakeServer.*` stubs with fetch() calls; each stub returns Promises so swap is straightforward.

--------------------
JS IMPLEMENTATION STARTS BELOW
--------------------
*/

(function () {
  'use strict';

  // ---------- Configuration ----------
  const APP_NAMESPACE = 'uni-help'; // localStorage namespace

  // Service types (display order is deliberate)
  const SERVICE_TYPES = ['Academic', 'Personal', 'Mental', 'Financial'];

  // Mock providers per university (replace by server data later)
  const MOCK_PROVIDERS = {
    uj: [
      { id: 'uj-t1', name: 'Dr. A. Ndlovu', role: 'Tutor', modules: ['ECO101', 'MTH101'], type: 'Academic', rating: 4.7, availableNow: true },
      { id: 'uj-c1', name: 'Ms. L. Mokoena', role: 'Counsellor', modules: [], type: 'Mental', rating: 4.9, availableNow: false }
    ],
    up: [
      { id: 'up-t1', name: 'Mr. P. van der Merwe', role: 'Tutor', modules: ['PHY101', 'ECO101'], type: 'Academic', rating: 4.5, availableNow: true },
      { id: 'up-c1', name: 'Ms. Z. Molefe', role: 'Counsellor', modules: [], type: 'Personal', rating: 4.6, availableNow: false }
    ],
    wits: [
      { id: 'wits-t1', name: 'Prof. K. Sithole', role: 'Tutor', modules: ['BIO101'], type: 'Academic', rating: 4.8, availableNow: false },
      { id: 'wits-c1', name: 'Dr. R. Patel', role: 'Counsellor', modules: [], type: 'Mental', rating: 4.9, availableNow: true }
    ]
  };

  // ---------- Helpers ----------
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'style') Object.assign(node.style, attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else if (c instanceof Node) node.appendChild(c);
    });
    return node;
  }

  function uid(prefix = '') { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  function saveState(key, value) {
    const storage = JSON.parse(localStorage.getItem(APP_NAMESPACE) || '{}');
    storage[key] = value;
    localStorage.setItem(APP_NAMESPACE, JSON.stringify(storage));
  }
  function loadState(key, defaultValue = null) {
    const storage = JSON.parse(localStorage.getItem(APP_NAMESPACE) || '{}');
    return (storage && storage[key] !== undefined) ? storage[key] : defaultValue;
  }

  function formatDateTimeISOLocal(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleString();
  }

  // Determine current university from filename
  function detectUniversity() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('uj')) return 'uj';
    if (path.includes('up-') || path.includes('/up') || path.includes('pretoria')) return 'up';
    if (path.includes('wits')) return 'wits';
    // fallback to 'uj'
    return 'uj';
  }

  function isStudentPage() {
    const filename = window.location.pathname.toLowerCase();
    return filename.includes('-student') || filename.includes('student');
  }

  // ---------- Fake server for frontend-only demo (Promises) ----------
  const fakeServer = {
    register(profile) {
      return new Promise((resolve) => {
        const students = loadState('students', {});
        profile.id = profile.id || uid('stu-');
        students[profile.id] = profile;
        saveState('students', students);
        resolve({ ok: true, student: profile });
      });
    },
    login(credentials) {
      return new Promise((resolve) => {
        const students = loadState('students', {});
        const found = Object.values(students).find(s => (s.email === credentials.email || s.studentNumber === credentials.studentNumber));
        if (found && (!credentials.password || credentials.password === found.password)) {
          resolve({ ok: true, student: found });
        } else resolve({ ok: false, error: 'Invalid credentials (demo mode)'});
      });
    },
    searchProviders({ university, q, module, type }) {
      return new Promise((resolve) => {
        const list = (MOCK_PROVIDERS[university] || []).filter(p => {
          if (q) {
            const ql = q.toLowerCase();
            if (!p.name.toLowerCase().includes(ql)) return false;
          }
          if (module && module.trim()) {
            if (!p.modules || !p.modules.some(m => m.toLowerCase() === module.toLowerCase())) return false;
          }
          if (type && type.trim()) {
            if ((p.type || '').toLowerCase() !== type.toLowerCase()) return false;
          }
          return true;
        });
        // sort: availableNow first, then rating
        list.sort((a,b) => (b.availableNow - a.availableNow) || (b.rating - a.rating));
        resolve(list);
      });
    },
    createRequest(request) {
      return new Promise((resolve) => {
        const requests = loadState('requests', []);
        request.id = request.id || uid('req-');
        request.status = 'Pending';
        request.createdAt = new Date().toISOString();
        requests.push(request);
        saveState('requests', requests);
        resolve({ ok: true, request });
      });
    },
    fetchRequests(studentId) {
      return new Promise((resolve) => {
        const requests = loadState('requests', []).filter(r => r.studentId === studentId);
        resolve(requests);
      });
    },
    updateRequest(requestId, patch) {
      return new Promise((resolve) => {
        const requests = loadState('requests', []);
        const idx = requests.findIndex(r => r.id === requestId);
        if (idx === -1) return resolve({ ok: false });
        request = Object.assign(requests[idx], patch);
        requests[idx] = request;
        saveState('requests', requests);
        resolve({ ok: true, request });
      });
    },
    sendNotification(notification) {
      // for demo we store notifications in localStorage
      return new Promise((resolve) => {
        const notes = loadState('notifications', []);
        notes.push(Object.assign({ id: uid('note-'), createdAt: new Date().toISOString() }, notification));
        saveState('notifications', notes);
        resolve({ ok: true });
      });
    }
  };

  // ---------- UI Builders ----------
  function createDashboardRoot() {
    // find the central welcome element and replace it with dashboard container.
    // Keep a reference to the original for non-destructive behavior.
    const welcomeNode = findCentralWelcomeNode();
    const container = el('div', { class: 'student-dashboard-root', style: { width: '100%', display: 'flex', 'justifyContent': 'center', 'alignItems': 'center', 'padding': '20px', 'boxSizing': 'border-box' } });
    const inner = el('div', { class: 'student-dashboard', style: { width: '100%', maxWidth: '1100px', 'backgroundColor': 'rgba(255,255,255,0.95)', 'borderRadius': '12px', 'boxShadow': '0 6px 24px rgba(0,0,0,0.12)', padding: '18px', color: '#111' } });
    container.appendChild(inner);
    if (welcomeNode && welcomeNode.parentNode) {
      welcomeNode.parentNode.replaceChild(container, welcomeNode);
    } else {
      // fallback: append to body
      document.body.appendChild(container);
    }
    return inner;
  }

  function findCentralWelcomeNode() {
    // heuristics: element containing 'welcome' text and center-aligned
    const candidates = qsa('body *');
    for (const c of candidates) {
      try {
        const txt = (c.textContent || '').trim().toLowerCase();
        if (txt.includes('welcome') && (window.getComputedStyle(c).textAlign === 'center' || /center/.test(c.className))) return c;
      } catch (e) { }
    }
    // last resort: find big H1/H2 in center
    const headings = ['h1','h2','h3'];
    for (const tag of headings) {
      const nodes = qsa(tag + ':not([data-preserve])');
      for (const n of nodes) {
        if ((n.textContent || '').toLowerCase().includes('welcome')) return n;
      }
    }
    return null;
  }

  function buildHeaderSection(root, student) {
    const header = el('div', { class: 'dash-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } });
    const title = el('div', { style: { display: 'flex', 'alignItems': 'center', gap: '12px' } }, [
      el('div', { style: { 'fontSize': '18px', 'fontWeight': '700' } }, `Welcome ${student ? student.name : 'Student'}`),
      el('div', { style: { 'fontSize': '12px', color: '#444' } }, student ? student.email || student.studentNumber : 'Please log in or create your profile')
    ]);

    const actions = el('div', { style: { display: 'flex', gap: '8px', 'alignItems': 'center' } });
    const profileBtn = el('button', { class: 'btn', style: { padding: '8px 12px', 'borderRadius': '8px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' } }, 'Profile');
    const logoutBtn = el('button', { class: 'btn-danger', style: { padding: '8px 12px', 'borderRadius': '8px', border: 'none', background: '#b22222', color: '#fff', cursor: 'pointer' } }, 'Logout');
    actions.appendChild(profileBtn);
    actions.appendChild(logoutBtn);

    header.appendChild(title);
    header.appendChild(actions);

    profileBtn.addEventListener('click', () => showProfileModal(student));
    logoutBtn.addEventListener('click', () => {
      saveState('currentStudent', null);
      location.reload();
    });

    root.appendChild(header);
  }

  function buildMainColumns(root, university, student) {
    const container = el('div', { style: { display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: '12px', alignItems: 'start' } });

    // Left: Search Filters + Recommended
    const left = el('div', { class: 'left-col' });
    left.appendChild(buildSearchPanel(university));
    left.appendChild(buildRecommendedPanel(university));

    // Middle: Search Results / Requests / Session Details
    const middle = el('div', { class: 'middle-col' });
    middle.appendChild(buildResultsPanel());
    middle.appendChild(buildRequestsPanel(student));

    // Right: Notifications + History
    const right = el('div', { class: 'right-col' });
    right.appendChild(buildNotificationsPanel(student));
    right.appendChild(buildHistoryPanel(student));

    container.appendChild(left);
    container.appendChild(middle);
    container.appendChild(right);

    root.appendChild(container);
  }

  // ------- Panels -------
  function buildSearchPanel(university) {
    const panel = el('div', { style: { padding: '12px', 'borderRadius': '8px', 'border': '1px solid #eee', 'backgroundColor': '#fff' } });
    panel.appendChild(el('h3', {}, 'Find help'));

    const form = el('form', { style: { display: 'grid', gap: '8px' } });
    const inputName = el('input', { placeholder: 'Name (optional)', type: 'text', class: 'input' });
    const inputModule = el('input', { placeholder: 'Module (ECO101)', type: 'text', class: 'input' });
    const selectType = el('select', { class: 'input' });
    selectType.appendChild(el('option', { value: '' }, 'Any service type'));
    SERVICE_TYPES.forEach(t => selectType.appendChild(el('option', { value: t }, t)));

    const btnSearch = el('button', { type: 'button', style: { padding: '8px 10px', cursor: 'pointer' } }, 'Search');
    const btnNeedNow = el('button', { type: 'button', style: { padding: '8px 10px', cursor: 'pointer', background: '#d9534f', color: '#fff', border: 'none' } }, 'Need Help Now');

    form.appendChild(inputName);
    form.appendChild(inputModule);
    form.appendChild(selectType);
    form.appendChild(el('div', { style: { display: 'flex', gap: '8px' } }, [btnSearch, btnNeedNow]));

    panel.appendChild(form);

    btnSearch.addEventListener('click', async () => {
      const results = await fakeServer.searchProviders({ university, q: inputName.value.trim(), module: inputModule.value.trim(), type: selectType.value });
      renderResults(results);
    });

    btnNeedNow.addEventListener('click', async () => {
      // find available providers in university
      const results = await fakeServer.searchProviders({ university, q: '', module: '', type: '' });
      const available = results.filter(r => r.availableNow);
      if (available.length === 0) {
        showToast('No one is available right now. Your request will be marked urgent.');
      }
      renderResults(available.length ? available : results);
    });

    return panel;
  }

  function buildRecommendedPanel(university) {
    const panel = el('div', { style: { padding: '12px', marginTop: '12px', 'borderRadius': '8px', border: '1px solid #eee', backgroundColor: '#fff' } });
    panel.appendChild(el('h4', {}, 'Recommended'));
    const list = el('div', { class: 'recommended-list' });
    panel.appendChild(list);

    fakeServer.searchProviders({ university, q: '', module: '', type: '' }).then(results => {
      results.slice(0,5).forEach(p => {
        const item = el('div', { style: { padding: '8px 4px', borderBottom: '1px solid #f2f2f2', display: 'flex', 'justifyContent': 'space-between', 'alignItems': 'center' } });
        item.appendChild(el('div', {}, [ el('div', { style: { fontWeight: '600' } }, p.name ), el('div', { style: { fontSize: '12px', color: '#666' } }, p.role + (p.modules && p.modules.length ? ' • ' + p.modules.join(', ') : '')) ]));
        const btn = el('button', { style: { padding: '6px 8px', cursor: 'pointer' } }, 'Request');
        btn.addEventListener('click', () => openRequestModal(p));
        item.appendChild(btn);
        list.appendChild(item);
      });
    });

    return panel;
  }

  function buildResultsPanel() {
    const panel = el('div', { style: { padding: '12px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#fff' } });
    panel.appendChild(el('h3', {}, 'Search results'));
    const list = el('div', { class: 'results-list' });
    panel.appendChild(list);

    // render function used globally
    window.__renderResultsTarget = list;

    return panel;
  }

  function buildRequestsPanel(student) {
    const panel = el('div', { style: { marginTop: '12px', padding: '12px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#fff' } });
    panel.appendChild(el('h3', {}, 'Your requests'));
    const list = el('div', { class: 'requests-list' });
    panel.appendChild(list);

    async function refresh() {
      if (!student) return list.appendChild(el('div', {}, 'Login to view your requests'));
      const requests = await fakeServer.fetchRequests(student.id);
      list.innerHTML = '';
      if (!requests.length) list.appendChild(el('div', {}, 'No requests yet'));
      requests.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      requests.forEach(r => {
        const row = el('div', { style: { padding: '8px 4px', borderBottom: '1px solid #f5f5f5' } });
        row.appendChild(el('div', { style: { fontWeight: '700' } }, `${r.providerName} • ${r.type}`));
        row.appendChild(el('div', { style: { fontSize: '12px', color: '#555' } }, `When: ${formatDateTimeISOLocal(r.datetime)} • Mode: ${r.mode} • Status: ${r.status}`));
        if (r.status === 'Approved') {
          const joinBtn = el('button', { style: { marginTop: '6px', padding: '6px 8px', cursor: 'pointer' } }, 'Join / Details');
          joinBtn.addEventListener('click', () => showSessionDetailsModal(r));
          row.appendChild(joinBtn);
        }
        list.appendChild(row);
      });
    }

    // initial refresh
    setTimeout(refresh, 50);
    return panel;
  }

  function buildNotificationsPanel(student) {
    const panel = el('div', { style: { padding: '12px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#fff' } });
    panel.appendChild(el('h4', {}, 'Notifications'));
    const list = el('div', { class: 'notifications-list' });
    panel.appendChild(list);

    function refresh() {
      const notes = loadState('notifications', []).filter(n => !student || n.studentId === student.id);
      list.innerHTML = '';
      if (!notes.length) list.appendChild(el('div', {}, 'No notifications'));
      notes.slice().reverse().forEach(n => {
        list.appendChild(el('div', { style: { padding: '8px 0', borderBottom: '1px solid #fafafa' } }, [el('div', { style: { fontSize: '13px', fontWeight: '600' } }, n.title), el('div', { style: { fontSize: '12px', color: '#666' } }, new Date(n.createdAt).toLocaleString())]));
      });
    }
    setTimeout(refresh, 40);
    return panel;
  }

  function buildHistoryPanel(student) {
    const panel = el('div', { style: { marginTop: '12px', padding: '12px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#fff' } });
    panel.appendChild(el('h4', {}, 'History'));
    const list = el('div', { class: 'history-list' });
    panel.appendChild(list);

    async function refresh() {
      if (!student) return list.appendChild(el('div', {}, 'Login to see history'));
      const requests = await fakeServer.fetchRequests(student.id);
      const finished = requests.filter(r => ['Completed','Declined'].includes(r.status));
      list.innerHTML = '';
      if (!finished.length) list.appendChild(el('div', {}, 'No history yet'));
      finished.forEach(r => {
        const item = el('div', { style: { padding: '8px 0', borderBottom: '1px solid #f6f6f6' } });
        item.appendChild(el('div', { style: { fontWeight: '700' } }, `${r.providerName} • ${r.status}`));
        item.appendChild(el('div', { style: { fontSize: '12px', color: '#666' } }, `${formatDateTimeISOLocal(r.datetime)} • ${r.mode}`));
        if (r.rating) item.appendChild(el('div', { style: { marginTop: '6px' } }, `Rating: ${r.rating} ★ — ${r.comment || ''}`));
        list.appendChild(item);
      });
    }

    setTimeout(refresh, 40);
    return panel;
  }

  // ------- Render helpers -------
  function renderResults(results) {
    const target = window.__renderResultsTarget;
    if (!target) return;
    target.innerHTML = '';
    if (!results || !results.length) return target.appendChild(el('div', {}, 'No results'));
    results.forEach(p => {
      const card = el('div', { style: { padding: '12px', borderBottom: '1px solid #f2f2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } });
      const left = el('div', {}, [el('div', { style: { fontWeight: '700' } }, p.name), el('div', { style: { fontSize: '13px', color: '#555' } }, `${p.role} • ${p.type} ${p.modules && p.modules.length ? ' • ' + p.modules.join(', ') : ''}`)]);
      const right = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } });
      const reqBtn = el('button', { style: { padding: '8px 10px', cursor: 'pointer' } }, 'Request Session');
      const avail = el('div', { style: { fontSize: '12px', color: p.availableNow ? '#117a37' : '#666' } }, p.availableNow ? 'Available now' : 'Not available');
      reqBtn.addEventListener('click', () => openRequestModal(p));
      right.appendChild(avail);
      right.appendChild(reqBtn);
      card.appendChild(left);
      card.appendChild(right);
      target.appendChild(card);
    });
  }

  // ------- Modals & Forms -------
  function showModal(contentNode, opts = {}) {
    const overlay = el('div', { class: 'modal-overlay', style: { position: 'fixed', inset: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.45)', zIndex: 9999 } });
    const box = el('div', { style: { width: 'min(720px,95%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '18px', borderRadius: '10px' } });
    const close = el('button', { style: { position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' } }, '✕');
    close.addEventListener('click', () => document.body.removeChild(overlay));
    box.appendChild(close);
    box.appendChild(contentNode);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    return { overlay, box };
  }

  function showProfileModal(currentStudent) {
    const form = el('div', {});
    form.appendChild(el('h3', {}, currentStudent ? 'Edit profile' : 'Create profile'));
    const inputName = el('input', { placeholder: 'Full name', value: currentStudent ? currentStudent.name : '', class: 'input' });
    const inputEmail = el('input', { placeholder: 'Student email (optional)', value: currentStudent ? currentStudent.email : '', class: 'input' });
    const inputNum = el('input', { placeholder: 'Student number', value: currentStudent ? currentStudent.studentNumber : '', class: 'input' });
    const inputPass = el('input', { placeholder: 'Password (demo)', type: 'password', class: 'input' });
    const photoPreview = el('img', { src: currentStudent && currentStudent.photo ? currentStudent.photo : '', style: { width: '78px', height: '78px', objectFit: 'cover', borderRadius: '8px', display: currentStudent && currentStudent.photo ? 'block' : 'none' } });
    const file = el('input', { type: 'file', accept: 'image/*' });
    const btnSave = el('button', { style: { marginTop: '12px', padding: '8px 12px', cursor: 'pointer' } }, 'Save');

    form.appendChild(photoPreview);
    form.appendChild(file);
    form.appendChild(inputName);
    form.appendChild(inputEmail);
    form.appendChild(inputNum);
    form.appendChild(inputPass);
    form.appendChild(btnSave);

    const modal = showModal(form);

    file.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        photoPreview.src = reader.result;
        photoPreview.style.display = 'block';
      };
      reader.readAsDataURL(f);
    });

    btnSave.addEventListener('click', async () => {
      const profile = {
        id: currentStudent ? currentStudent.id : undefined,
        name: inputName.value.trim() || 'Unnamed Student',
        email: inputEmail.value.trim() || undefined,
        studentNumber: inputNum.value.trim() || undefined,
        password: inputPass.value || undefined,
        photo: photoPreview.src || undefined
      };
      const res = await fakeServer.register(profile);
      if (res.ok) {
        saveState('currentStudent', res.student);
        showToast('Profile saved');
        location.reload();
      } else showToast('Failed to save profile');
    });
  }

  function openRequestModal(provider) {
    const content = el('div', {});
    content.appendChild(el('h3', {}, `Request session with ${provider.name}`));
    const selectMode = el('select', {}, [el('option', { value: 'Online' }, 'Online'), el('option', { value: 'In-person' }, 'In-person')]);
    const inputDatetime = el('input', { type: 'datetime-local' });
    const note = el('textarea', { placeholder: 'Optional note', style: { width: '100%', minHeight: '80px' } });
    const btnSubmit = el('button', { style: { marginTop: '10px', padding: '8px 12px', cursor: 'pointer' } }, 'Send request');
    content.appendChild(el('div', {}, ['Mode: ', selectMode]));
    content.appendChild(el('div', {}, ['When: ', inputDatetime]));
    content.appendChild(el('div', {}, ['Note: ', note]));
    content.appendChild(btnSubmit);

    const modal = showModal(content);

    btnSubmit.addEventListener('click', async () => {
      const student = loadState('currentStudent', null);
      if (!student) return showToast('Please create a profile first');
      const request = {
        studentId: student.id,
        studentName: student.name,
        providerId: provider.id,
        providerName: provider.name,
        university: detectUniversity(),
        type: provider.type || 'Academic',
        mode: selectMode.value,
        datetime: inputDatetime.value || new Date().toISOString(),
        note: note.value,
      };
      const res = await fakeServer.createRequest(request);
      if (res.ok) {
        showToast('Request submitted');
        // send notification to student (demo stored in localStorage)
        fakeServer.sendNotification({ studentId: student.id, title: `Request sent to ${provider.name}` });
        document.body.removeChild(modal.overlay);
        // refresh requests panel
        setTimeout(() => location.reload(), 300);
      } else showToast('Failed to submit');
    });
  }

  function showSessionDetailsModal(request) {
    const content = el('div', {});
    content.appendChild(el('h3', {}, 'Session details'));
    content.appendChild(el('div', {}, `Provider: ${request.providerName}`));
    content.appendChild(el('div', {}, `When: ${formatDateTimeISOLocal(request.datetime)}`));
    content.appendChild(el('div', {}, `Mode: ${request.mode}`));
    if (request.mode === 'Online') content.appendChild(el('div', {}, `Meeting link: ${request.meetingLink || '(set by provider later)'}`));
    if (request.mode === 'In-person') content.appendChild(el('div', {}, `Location: ${request.location || '(set by provider later)'}`));

    if (request.status === 'Approved') {
      const btnJoin = el('a', { href: request.meetingLink || '#', style: { display: 'inline-block', marginTop: '10px', padding: '8px 12px', background: '#117a37', color: '#fff', textDecoration: 'none' } }, 'Join session');
      content.appendChild(btnJoin);
    }

    // If completed, rating interface
    if (request.status === 'Completed' && !request.rating) {
      const rating = el('input', { type: 'number', min: 1, max: 5, placeholder: '1-5' });
      const comment = el('textarea', { placeholder: 'Comment (optional)', style: { width: '100%', minHeight: '60px' } });
      const btnRate = el('button', { style: { marginTop: '8px', padding: '8px 12px', cursor: 'pointer' } }, 'Submit rating');
      content.appendChild(el('div', {}, ['Rating: ', rating]));
      content.appendChild(comment);
      content.appendChild(btnRate);
      btnRate.addEventListener('click', async () => {
        const r = parseInt(rating.value, 10);
        if (!r || r < 1 || r > 5) return showToast('Please provide a rating 1–5');
        await fakeServer.updateRequest(request.id, { rating: r, comment: comment.value });
        showToast('Thanks for your feedback');
        location.reload();
      });
    }

    showModal(content);
  }

  // Simple toast
  function showToast(msg) {
    const t = el('div', { style: { position: 'fixed', right: '18px', bottom: '18px', background: '#222', color: '#fff', padding: '10px 14px', borderRadius: '8px', zIndex: 10000 } }, msg);
    document.body.appendChild(t);
    setTimeout(() => { if (t && t.parentNode) t.parentNode.removeChild(t); }, 3000);
  }

  // ------- Initialization -------
  function init() {
    const university = detectUniversity();

    // Do not run on non-student pages, but still provide a small button to open dashboard if you want.
    if (!isStudentPage()) {
      // add a small debug control in top-right if dev mode
      const btn = el('button', { style: { position: 'fixed', right: '12px', bottom: '12px', zIndex: 9999, padding: '10px', borderRadius: '8px', cursor: 'pointer' } }, 'Open Student Dashboard');
      btn.addEventListener('click', () => { buildDashboardRoot(); attachApp(university); });
      document.body.appendChild(btn);
      return;
    }

    const root = createDashboardRoot();
    attachApp(university, root);
  }

  async function attachApp(university, root) {
    const student = loadState('currentStudent', null);

    // top header
    buildHeaderSection(root, student);
    // main columns
    buildMainColumns(root, university, student);

    // show login/create CTA if not logged in
    if (!student) {
      const loginCTA = el('div', { style: { marginTop: '10px', display: 'flex', gap: '8px' } });
      const btnLogin = el('button', { style: { padding: '8px 12px', cursor: 'pointer' } }, 'Create / Login');
      btnLogin.addEventListener('click', () => showAuthModal(university));
      loginCTA.appendChild(btnLogin);
      root.insertBefore(loginCTA, root.firstChild.nextSibling);
    }

    // initial render: recommended list and empty results
    const initialProviders = await fakeServer.searchProviders({ university, q: '', module: '', type: '' });
    renderResults(initialProviders);
  }

  function showAuthModal(university) {
    const content = el('div', {});
    content.appendChild(el('h3', {}, 'Create profile or login (demo)'));
    const inputName = el('input', { placeholder: 'Full name (for register)', class: 'input' });
    const inputEmail = el('input', { placeholder: 'Student email', class: 'input' });
    const inputNum = el('input', { placeholder: 'Student number', class: 'input' });
    const inputPass = el('input', { placeholder: 'Password (demo)', type: 'password', class: 'input' });
    const btnRegister = el('button', { style: { padding: '8px 12px', cursor: 'pointer' } }, 'Register');
    const btnLogin = el('button', { style: { padding: '8px 12px', marginLeft: '8px', cursor: 'pointer' } }, 'Login');

    content.appendChild(inputName);
    content.appendChild(inputEmail);
    content.appendChild(inputNum);
    content.appendChild(inputPass);
    content.appendChild(el('div', {}, [btnRegister, btnLogin]));

    const modal = showModal(content);

    btnRegister.addEventListener('click', async () => {
      const profile = { name: inputName.value || 'Unnamed', email: inputEmail.value || undefined, studentNumber: inputNum.value || undefined, password: inputPass.value || undefined };
      const res = await fakeServer.register(profile);
      if (res.ok) {
        saveState('currentStudent', res.student);
        showToast('Registered — profile created');
        location.reload();
      } else showToast('Failed to register');
    });

    btnLogin.addEventListener('click', async () => {
      const creds = { email: inputEmail.value || undefined, studentNumber: inputNum.value || undefined, password: inputPass.value || undefined };
      const res = await fakeServer.login(creds);
      if (res.ok) {
        saveState('currentStudent', res.student);
        showToast('Logged in');
        location.reload();
      } else showToast('Login failed');
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(init, 40);
  else document.addEventListener('DOMContentLoaded', init);

})();


