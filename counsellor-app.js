/*
counsellor-app.js
Counsellor-facing frontend logic — ready for UJ, UP, WITS counsellor pages.

STRUCTURE
1) Integration notes
2) Backend integration points (to replace fakeServer)
3) Full JS Implementation — all UI and localStorage logic.

-----------------------
GITHUB / DEPLOY STEPS
-----------------------
1. Save as counsellor-app.js in your project root.
2. Add <script src="./counsellor-app.js" defer></script> at the bottom of each *counsellor* page (e.g. uj-counsellor.html).
3. Commit & push:
   git add counsellor-app.js
   git commit -m "Add counsellor frontend logic (profile, requests, sessions, reports)"
   git push
4. Open uj-counsellor.html etc — dashboard replaces the welcome area automatically.

-----------------------
BACKEND INTEGRATION (later)
-----------------------
fakeServer.loginCounsellor()         → POST /api/counsellor/login
fakeServer.registerCounsellor()      → POST /api/counsellors
fakeServer.fetchCounsellorRequests() → GET /api/counsellors/:id/requests
fakeServer.updateRequest()           → PATCH /api/requests/:id
fakeServer.submitReport()            → POST /api/counselling-reports
fakeServer.toggleAvailability()      → PATCH /api/counsellors/:id/availability
fakeServer.fetchSchedule()           → GET /api/counsellors/:id/schedule
*/

(function(){
  'use strict';

  const APP_NAMESPACE = 'uni-help-counsellor';

  // ---------------- HELPERS ----------------
  function qs(sel, root=document){return root.querySelector(sel);}
  function qsa(sel, root=document){return Array.from(root.querySelectorAll(sel));}
  function el(tag, attrs={}, children=[]){
    const node = document.createElement(tag);
    for(const k in attrs){
      if(k==='class') node.className = attrs[k];
      else if(k==='style') Object.assign(node.style, attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
    (Array.isArray(children)?children:[children]).forEach(c=>{
      if(typeof c==='string') node.appendChild(document.createTextNode(c));
      else if(c instanceof Node) node.appendChild(c);
    });
    return node;
  }
  function uid(prefix=''){return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
  function saveState(key,value){
    const store = JSON.parse(localStorage.getItem(APP_NAMESPACE)||'{}');
    store[key]=value;
    localStorage.setItem(APP_NAMESPACE,JSON.stringify(store));
  }
  function loadState(key,def=null){
    const store = JSON.parse(localStorage.getItem(APP_NAMESPACE)||'{}');
    return store[key]!==undefined?store[key]:def;
  }
  function detectUniversity(){
    const path = window.location.pathname.toLowerCase();
    if(path.includes('uj')) return 'uj';
    if(path.includes('up')||path.includes('pretoria')) return 'up';
    if(path.includes('wits')) return 'wits';
    return 'uj';
  }
  function isCounsellorPage(){
    const filename = window.location.pathname.toLowerCase();
    return filename.includes('-counsellor')||filename.includes('counsellor');
  }
  function formatDateTime(dt){
    if(!dt) return '';
    return new Date(dt).toLocaleString();
  }

  // ---------------- FAKE SERVER ----------------
  const fakeServer = {
    registerCounsellor(profile){
      return new Promise(res=>{
        const counsellors = loadState('counsellors', {});
        profile.id = profile.id || uid('counsellor-');
        counsellors[profile.id] = profile;
        saveState('counsellors', counsellors);
        res({ok:true,counsellor:profile});
      });
    },
    loginCounsellor(credentials){
      return new Promise(res=>{
        const counsellors = loadState('counsellors', {});
        const found = Object.values(counsellors).find(c=>
          (c.email===credentials.email||c.staffNumber===credentials.staffNumber)
        );
        if(found && (!credentials.password || found.password===credentials.password))
          res({ok:true,counsellor:found});
        else res({ok:false,error:'Invalid credentials'});
      });
    },
    fetchCounsellorRequests(counsellorId){
      return new Promise(res=>{
        const requests = loadState('counsellingRequests', []).filter(r=>r.counsellorId===counsellorId);
        res(requests);
      });
    },
    updateRequest(requestId, patch){
      return new Promise(res=>{
        const requests = loadState('counsellingRequests', []);
        const idx = requests.findIndex(r=>r.id===requestId);
        if(idx===-1) return res({ok:false});
        requests[idx] = Object.assign(requests[idx], patch);
        saveState('counsellingRequests', requests);
        res({ok:true,request:requests[idx]});
      });
    },
    submitReport(report){
      return new Promise(res=>{
        const reports = loadState('counsellingReports', []);
        reports.push(report);
        saveState('counsellingReports', reports);
        res({ok:true});
      });
    },
    sendNotification(note){
      return new Promise(res=>{
        const notes = loadState('notifications', []);
        note.id = uid('note-');
        note.createdAt = new Date().toISOString();
        notes.push(note);
        saveState('notifications', notes);
        res({ok:true});
      });
    },
    fetchSchedule(counsellorId){
      return new Promise(res=>{
        const requests = loadState('counsellingRequests', []);
        const schedule = requests.filter(r=>r.counsellorId===counsellorId && (r.status==='Approved'));
        res(schedule);
      });
    }
  };

  // ---------------- UI BUILDERS ----------------
  function createDashboardRoot(){
    const welcome = findWelcomeNode();
    const container = el('div',{class:'counsellor-dashboard-root',style:{width:'100%',display:'flex',justifyContent:'center',alignItems:'center',padding:'20px',boxSizing:'border-box'}});
    const inner = el('div',{class:'counsellor-dashboard',style:{width:'100%',maxWidth:'1100px',backgroundColor:'rgba(255,255,255,0.95)',borderRadius:'12px',boxShadow:'0 6px 24px rgba(0,0,0,0.12)',padding:'18px',color:'#111'}});
    container.appendChild(inner);
    if(welcome && welcome.parentNode) welcome.parentNode.replaceChild(container,welcome);
    else document.body.appendChild(container);
    return inner;
  }
  function findWelcomeNode(){
    const nodes = qsa('body *');
    for(const n of nodes){
      const txt = (n.textContent||'').toLowerCase();
      if(txt.includes('welcome') && /center/.test(window.getComputedStyle(n).textAlign)) return n;
    }
    return null;
  }

  function buildHeader(root, counsellor){
    const header = el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}});
    const left = el('div',{style:{display:'flex',alignItems:'center',gap:'10px'}},[
      el('div',{style:{fontWeight:'700',fontSize:'18px'}},`Welcome ${counsellor?counsellor.name||'Counsellor':''}`),
      el('div',{style:{fontSize:'12px',color:'#444'}},counsellor?counsellor.email||'':'Login to access dashboard')
    ]);
    const right = el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}});
    const availSwitch = el('button',{style:{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ccc',cursor:'pointer',background:counsellor&&counsellor.availableNow?'#117a37':'#fff',color:counsellor&&counsellor.availableNow?'#fff':'#111'}},counsellor&&counsellor.availableNow?'Available Now':'Set Available');
    const profileBtn = el('button',{style:{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ccc',cursor:'pointer'}},'Profile');
    const logoutBtn = el('button',{style:{padding:'8px 12px',borderRadius:'8px',background:'#b22222',color:'#fff',border:'none',cursor:'pointer'}},'Logout');
    right.append(availSwitch,profileBtn,logoutBtn);
    header.append(left,right);

    profileBtn.onclick=()=>showProfileModal(counsellor);
    logoutBtn.onclick=()=>{saveState('currentCounsellor',null);location.reload();};
    availSwitch.onclick=()=>{
      const c = loadState('currentCounsellor',null);
      if(!c) return showToast('Login first');
      c.availableNow = !c.availableNow;
      saveState('currentCounsellor',c);
      fakeServer.sendNotification({counsellorId:c.id,title:`Availability set to ${c.availableNow?'ON':'OFF'}`});
      showToast(`Availability ${c.availableNow?'ON':'OFF'}`);
      location.reload();
    };

    root.appendChild(header);
  }

  function buildColumns(root,counsellor){
    const grid = el('div',{style:{display:'grid',gridTemplateColumns:'320px 1fr 320px',gap:'12px',alignItems:'start'}});
    const left = el('div');
    const middle = el('div');
    const right = el('div');

    left.append(buildRequestsPanel(counsellor));
    middle.append(buildSessionPanel(counsellor));
    right.append(buildSchedulePanel(counsellor));
    right.append(buildNotificationsPanel(counsellor));

    grid.append(left,middle,right);
    root.appendChild(grid);
  }

  // ---------------- PANELS ----------------
  function buildRequestsPanel(counsellor){
    const panel = el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff'}});
    panel.append(el('h3',{},'Student Requests'));
    const list = el('div',{}); panel.append(list);

    async function refresh(){
      if(!counsellor) return list.textContent='Login to view requests';
      const reqs = await fakeServer.fetchCounsellorRequests(counsellor.id);
      list.innerHTML='';
      if(!reqs.length) return list.textContent='No requests yet.';
      reqs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      reqs.forEach(r=>{
        const row = el('div',{style:{padding:'8px 4px',borderBottom:'1px solid #f2f2f2'}});
        row.append(el('div',{style:{fontWeight:'700'}},`${r.studentName||'Anonymous'} • ${r.serviceType}`));
        row.append(el('div',{style:{fontSize:'12px',color:'#555'}},`Pref time: ${formatDateTime(r.datetime)} | Mode: ${r.mode} | Status: ${r.status}`));
        const actions = el('div',{style:{marginTop:'6px',display:'flex',gap:'6px'}});
        const btnApprove = el('button',{style:{padding:'6px 8px',cursor:'pointer'}},'Approve');
        const btnReject = el('button',{style:{padding:'6px 8px',cursor:'pointer',background:'#d9534f',color:'#fff',border:'none'}},'Reject');
        const btnSuggest = el('button',{style:{padding:'6px 8px',cursor:'pointer'}},'Suggest time');
        btnApprove.onclick=()=>updateRequestStatus(r,'Approved');
        btnReject.onclick=()=>updateRequestStatus(r,'Declined');
        btnSuggest.onclick=()=>suggestTime(r);
        actions.append(btnApprove,btnReject,btnSuggest);
        row.append(actions);
        list.append(row);
      });
    }

    async function updateRequestStatus(r,status){
      await fakeServer.updateRequest(r.id,{status});
      await fakeServer.sendNotification({studentId:r.studentId,title:`Your counselling request was ${status.toLowerCase()}`});
      showToast(`Request ${status}`);
      refresh();
    }
    function suggestTime(r){
      const input = prompt('Enter new suggested time (e.g. 2025-11-12T14:00)');
      if(!input) return;
      fakeServer.updateRequest(r.id,{suggestedTime:input,status:'Suggested'}).then(()=>{
        fakeServer.sendNotification({studentId:r.studentId,title:`Counsellor suggested new time`});
        showToast('Suggested new time');
        refresh();
      });
    }

    setTimeout(refresh,60);
    return panel;
  }

  function buildSessionPanel(counsellor){
    const panel = el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff'}});
    panel.append(el('h3',{},'Active / Upcoming Sessions'));
    const list = el('div',{}); panel.append(list);

    async function refresh(){
      if(!counsellor) return list.textContent='Login to view sessions';
      const reqs = await fakeServer.fetchCounsellorRequests(counsellor.id);
      const active = reqs.filter(r=>r.status==='Approved');
      list.innerHTML='';
      if(!active.length) return list.textContent='No active sessions.';
      active.forEach(r=>{
        const row = el('div',{style:{padding:'8px 4px',borderBottom:'1px solid #f2f2f2'}});
        row.append(el('div',{style:{fontWeight:'700'}},`${r.studentName||'Anonymous'} (${r.serviceType})`));
        row.append(el('div',{style:{fontSize:'12px',color:'#555'}},`${formatDateTime(r.datetime)} • ${r.mode}`));
        const joinBtn = el('button',{style:{marginTop:'6px',padding:'6px 8px',cursor:'pointer'}},'Open / Report');
        joinBtn.onclick=()=>openSessionModal(r);
        row.append(joinBtn);
        list.append(row);
      });
    }
    setTimeout(refresh,60);
    return panel;
  }

  function buildSchedulePanel(counsellor){
    const panel = el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff',marginBottom:'12px'}});
    panel.append(el('h4',{},'Upcoming Schedule'));
    const list = el('div',{}); panel.append(list);

    async function refresh(){
      if(!counsellor) return list.textContent='Login to view schedule';
      const schedule = await fakeServer.fetchSchedule(counsellor.id);
      list.innerHTML='';
      if(!schedule.length) return list.textContent='No sessions booked';
      schedule.sort((a,b)=>new Date(a.datetime)-new Date(b.datetime));
      schedule.forEach(s=>{
        list.append(el('div',{style:{padding:'6px 0',borderBottom:'1px solid #f2f2f2'}},[
          el('div',{style:{fontWeight:'600'}},`${s.studentName||'Anonymous'}`),
          el('div',{style:{fontSize:'13px',color:'#555'}},`${formatDateTime(s.datetime)} • ${s.mode}`)
        ]));
      });
    }
    setTimeout(refresh,60);
    return panel;
  }

  function buildNotificationsPanel(counsellor){
    const panel = el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff',marginTop:'12px'}});
    panel.append(el('h4',{},'Notifications'));
    const list = el('div',{}); panel.append(list);
    function refresh(){
      const notes = loadState('notifications',[]).filter(n=>!counsellor||n.counsellorId===counsellor.id);
      list.innerHTML='';
      if(!notes.length) return list.textContent='No notifications';
      notes.slice().reverse().forEach(n=>{
        list.append(el('div',{style:{padding:'6px 0',borderBottom:'1px solid #fafafa'}},[
          el('div',{style:{fontSize:'13px',fontWeight:'600'}},n.title),
          el('div',{style:{fontSize:'12px',color:'#666'}},new Date(n.createdAt).toLocaleString())
        ]));
      });
    }
    setTimeout(refresh,60);
    return panel;
  }

  // ---------------- MODALS ----------------
  function showProfileModal(counsellor){
    const form = el('div',{}); form.append(el('h3',{},counsellor?'Edit Profile':'Create Profile'));
    const inputName = el('input',{placeholder:'Full Name',value:counsellor?counsellor.name:'',class:'input'});
    const inputEmail = el('input',{placeholder:'Email',value:counsellor?counsellor.email:'',class:'input'});
    const inputQual = el('input',{placeholder:'Qualifications',value:counsellor?counsellor.qualifications:'',class:'input'});
    const inputServices = el('input',{placeholder:'Services offered (comma separated)',value:counsellor?counsellor.services:'',class:'input'});
    const file = el('input',{type:'file',accept:'image/*'});
    const imgPrev = el('img',{src:counsellor&&counsellor.photo?counsellor.photo:'',style:{width:'78px',height:'78px',objectFit:'cover',borderRadius:'8px',display:counsellor&&counsellor.photo?'block':'none'}});
    const btnSave = el('button',{style:{marginTop:'12px',padding:'8px 12px',cursor:'pointer'}},'Save');
    form.append(imgPrev,file,inputName,inputEmail,inputQual,inputServices,btnSave);

    const modal = showModal(form);
    file.onchange=(e)=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=()=>{imgPrev.src=r.result;imgPrev.style.display='block';};
      r.readAsDataURL(f);
