/*
tutor-app.js
Tutor-facing frontend logic (UJ, UP, WITS Tutor Portals)

- Reuses the same layout from app.js (student portal)
- Does NOT modify logos or backgrounds
- Replaces only the “Welcome” section with Tutor Dashboard
*/

(function () {
  'use strict';

  const APP_NAMESPACE = 'uni-help-tutors';

  // ---------------- HELPERS ----------------
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, attrs = {}, children = []) => {
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
  };
  const uid = (prefix = '') =>
    prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const saveState = (k, v) => {
    const d = JSON.parse(localStorage.getItem(APP_NAMESPACE) || '{}');
    d[k] = v;
    localStorage.setItem(APP_NAMESPACE, JSON.stringify(d));
  };
  const loadState = (k, def = null) => {
    const d = JSON.parse(localStorage.getItem(APP_NAMESPACE) || '{}');
    return (d && k in d) ? d[k] : def;
  };

  // -------------- PAGE DETECTION ---------------
  const detectUniversity = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('uj')) return 'uj';
    if (path.includes('up')) return 'up';
    if (path.includes('wits')) return 'wits';
    return 'uj';
  };
  const isTutorPage = () => /tutor/.test(location.pathname.toLowerCase());

  // -------------- FAKE SERVER (DEMO) ----------------
  const fakeServer = {
    registerTutor(profile) {
      return new Promise(res => {
        const tutors = loadState('tutors', {});
        profile.id = profile.id || uid('tut-');
        tutors[profile.id] = profile;
        saveState('tutors', tutors);
        res({ ok: true, tutor: profile });
      });
    },
    loginTutor(creds) {
      return new Promise(res => {
        const tutors = loadState('tutors', {});
        const found = Object.values(tutors).find(t =>
          (t.email === creds.email || t.staffNumber === creds.staffNumber) &&
          (!creds.password || creds.password === t.password)
        );
        if (found) res({ ok: true, tutor: found });
        else res({ ok: false, error: 'Invalid credentials' });
      });
    },
    fetchTutorRequests(tutorId) {
      const global = JSON.parse(localStorage.getItem('uni-help') || '{}');
      const all = global.requests || [];
      return Promise.resolve(all.filter(r => r.providerId === tutorId));
    },
    updateRequest(reqId, patch) {
      const global = JSON.parse(localStorage.getItem('uni-help') || '{}');
      const reqs = global.requests || [];
      const i = reqs.findIndex(r => r.id === reqId);
      if (i !== -1) {
        reqs[i] = Object.assign(reqs[i], patch);
        global.requests = reqs;
        localStorage.setItem('uni-help', JSON.stringify(global));
      }
      return Promise.resolve({ ok: true });
    }
  };

  // -------------- UI CREATION -----------------
  function findWelcomeNode() {
    for (const n of qsa('body *')) {
      if ((n.textContent || '').toLowerCase().includes('welcome')) return n;
    }
    return null;
  }

  function createDashboardRoot() {
    const welcome = findWelcomeNode();
    const wrap = el('div', {
      class: 'tutor-dashboard-root',
      style: { display: 'flex', justifyContent: 'center', padding: '20px' }
    });
    const box = el('div', {
      style: {
        width: '100%',
        maxWidth: '1100px',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        padding: '18px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.1)'
      }
    });
    wrap.appendChild(box);
    if (welcome && welcome.parentNode)
      welcome.parentNode.replaceChild(wrap, welcome);
    else document.body.appendChild(wrap);
    return box;
  }

  // -------------- DASHBOARD -----------------
  async function initDashboard(root, tutor, uni) {
    const head = el('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }
    });
    head.appendChild(el('div', {}, [`Welcome ${tutor?.name || 'Tutor'}`]));
    const actions = el('div', { style: { display: 'flex', gap: '8px' } });
    const btnProfile = el('button', {}, 'Profile');
    const btnLogout = el('button', {}, 'Logout');
    actions.append(btnProfile, btnLogout);
    head.appendChild(actions);
    root.appendChild(head);

    btnProfile.onclick = () => showProfileModal(tutor);
    btnLogout.onclick = () => { saveState('currentTutor', null); location.reload(); };

    const grid = el('div', {
      style: { display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: '12px' }
    });
    const left = el('div'), mid = el('div'), right = el('div');

    left.appendChild(buildAvailabilityPanel(tutor));
    left.appendChild(buildSchedulePanel(tutor));
    mid.appendChild(await buildRequestsPanel(tutor));
    right.appendChild(buildNotificationsPanel(tutor));
    right.appendChild(buildRatingsPanel(tutor));

    grid.append(left, mid, right);
    root.appendChild(grid);
  }

  // -------- PANELS --------
  const buildAvailabilityPanel = t => {
    const p = el('div', { style: panelStyle() });
    p.appendChild(el('h3', {}, 'Availability'));
    const toggle = el('input', { type: 'checkbox' });
    toggle.checked = t?.availableNow || false;
    const label = el('label', {}, ['Available now ', toggle]);
    p.appendChild(label);
    toggle.onchange = () => {
      t.availableNow = toggle.checked;
      const tutors = loadState('tutors', {});
      tutors[t.id] = t;
      saveState('tutors', tutors);
      showToast('Availability updated');
    };
    return p;
  };

  const buildSchedulePanel = t => {
    const p = el('div', { style: panelStyle(true) });
    p.appendChild(el('h3', {}, 'Weekly Schedule'));
    const input = el('textarea', { placeholder: 'Mon 10-12, Wed 2-4pm', style: { width: '100%', minHeight: '80px' } }, t?.schedule || '');
    const btn = el('button', { style: { marginTop: '8px' } }, 'Save');
    btn.onclick = () => {
      t.schedule = input.value;
      const tutors = loadState('tutors', {});
      tutors[t.id] = t;
      saveState('tutors', tutors);
      showToast('Schedule saved');
    };
    p.append(input, btn);
    return p;
  };

  async function buildRequestsPanel(t) {
    const p = el('div', { style: panelStyle() });
    p.appendChild(el('h3', {}, 'Student Requests'));
    const list = el('div'); p.appendChild(list);
    const reqs = await fakeServer.fetchTutorRequests(t?.id);
    if (!reqs.length) list.appendChild(el('div', {}, 'No requests yet'));
    reqs.forEach(r => {
      const row = el('div', { style: { padding: '8px', borderBottom: '1px solid #f2f2f2' } });
      row.appendChild(el('div', { style: { fontWeight: '700' } }, r.studentName));
      row.appendChild(el('div', { style: { fontSize: '12px', color: '#555' } },
        `${r.type} • ${r.mode} • ${new Date(r.datetime).toLocaleString()}`));
      const btns = el('div', { style: { marginTop: '6px', display: 'flex', gap: '6px' } });
      const b1 = el('button', {}, 'Approve');
      const b2 = el('button', {}, 'Reject');
      const b3 = el('button', {}, 'Suggest Time');
      btns.append(b1, b2, b3); row.appendChild(btns);
      list.appendChild(row);
      b1.onclick = async () => { await fakeServer.updateRequest(r.id, { status: 'Approved' }); showToast('Approved'); location.reload(); };
      b2.onclick = async () => { await fakeServer.updateRequest(r.id, { status: 'Declined' }); showToast('Declined'); location.reload(); };
      b3.onclick = () => showSuggestTimeModal(r);
    });
    return p;
  }

  const buildNotificationsPanel = () => {
    const p = el('div', { style: panelStyle() });
    p.appendChild(el('h4', {}, 'Notifications'));
    p.appendChild(el('div', {}, 'New request alerts will appear here.'));
    return p;
  };

  const buildRatingsPanel = t => {
    const p = el('div', { style: panelStyle(true) });
    p.appendChild(el('h4', {}, 'Student Ratings'));
    const allReqs = JSON.parse(localStorage.getItem('uni-help') || '{}').requests || [];
    const ratings = allReqs.filter(r => r.providerId === t.id && r.rating);
    if (!ratings.length) return p.appendChild(el('div', {}, 'No ratings yet')), p;
    ratings.forEach(r => {
      p.appendChild(el('div', { style: { padding: '6px 0', borderBottom: '1px solid #f3f3f3' } },
        `${r.studentName}: ${r.rating}★ – ${r.comment || ''}`));
    });
    return p;
  };

  const panelStyle = (mt = false) => ({
    padding: '12px',
    border: '1px solid #eee',
    borderRadius: '8px',
    background: '#fff',
    marginTop: mt ? '12px' : '0'
  });

  // -------- MODALS --------
  function showProfileModal(t) {
    const f = el('div');
    f.appendChild(el('h3', {}, t ? 'Edit Profile' : 'Create Profile'));
    const name = el('input', { placeholder: 'Full name', value: t?.name || '' });
    const email = el('input', { placeholder: 'Email', value: t?.email || '' });
    const staff = el('input', { placeholder: 'Staff number', value: t?.staffNumber || '' });
    const bio = el('textarea', { placeholder: 'Short bio', style: { width: '100%', minHeight: '60px' } }, t?.bio || '');
    const modules = el('input', { placeholder: 'Modules (comma separated)', value: t?.modules?.join(', ') || '' });
    const photo = el('input', { type: 'file', accept: 'image/*' });
    const img = el('img', { src: t?.photo || '', style: { width: '80px', height: '80px', objectFit: 'cover', display: t?.photo ? 'block' : 'none', borderRadius: '8px' } });
    const btn = el('button', { style: { marginTop: '8px', padding: '8px 12px' } }, 'Save');
    f.append(img, photo, name, email, staff, bio, modules, btn);
    const modal = showModal(f);
    photo.onchange = e => {
      const file = e.target.files[0];
      const r = new FileReader();
      r.onload = () => { img.src = r.result; img.style.display = 'block'; };
      r.readAsDataURL(file);
    };
    btn.onclick = async () => {
      const profile = {
        id: t?.id, name: name.value, email: email.value, staffNumber: staff.value,
        bio: bio.value, modules: modules.value.split(',').map(s => s.trim()).filter(Boolean),
        photo: img.src
      };
      const res = await fakeServer.registerTutor(profile);
      if (res.ok) { saveState('currentTutor', res.tutor); showToast('Profile saved'); location.reload(); }
    };
  }

  function showSuggestTimeModal(r) {
    const d = el('div');
    d.appendChild(el('h3', {}, `Suggest another time for ${r.studentName}`));
    const input = el('input', { type: 'datetime-local' });
    const btn = el('button', { style: { marginTop: '8px' } }, 'Send Suggestion');
    d.append(input, btn);
    const modal = showModal(d);
    btn.onclick = async () => {
      await fakeServer.updateRequest(r.id, { suggestedTime: input.value, status: 'Pending' });
      showToast('Suggestion sent'); location.reload();
    };
  }

  const showModal = content => {
    const overlay = el('div', {
      style: {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.45)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
      }
    });
    const box = el('div', {
      style: { background: '#fff', padding: '20px', borderRadius: '8px', width: 'min(600px,95%)', position: 'relative' }
    });
    const close = el('button', {
      style: { position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', fontSize: '20px' }
    }, '✕');
    close.onclick = () => document.body.removeChild(overlay);
    box.append(close, content); overlay.appendChild(box);
    document.body.appendChild(overlay);
    return { overlay, box };
  };

  const showToast = msg => {
    const t = el('div', {
      style: {
        position: 'fixed', bottom: '16px', right: '16px', background: '#222',
        color: '#fff', padding: '10px 14px', borderRadius: '8px', zIndex: 10000
      }
    }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };


  // -------- INIT --------
  function init() {
  const uni = detectUniversity();
  if (!isTutorPage()) return;
  const root = createDashboardRoot();

  // 👇 Skip login/register — go straight to dashboard
  const defaultTutor = {
    id: 'auto-tutor-' + uni,
    name: uni.toUpperCase() + ' Tutor',
    email: `${uni}@mentorhub.edu`,
    staffNumber: `TUT-${uni.toUpperCase()}`,
    bio: 'Default demo tutor profile for ' + uni.toUpperCase(),
    modules: ['Demo Module 1', 'Demo Module 2'],
    availableNow: true
  };

  saveState('currentTutor', defaultTutor);
  initDashboard(root, defaultTutor, uni);
}

document.addEventListener('DOMContentLoaded', init);
