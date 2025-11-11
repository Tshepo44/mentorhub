/*
tutor-app.js
Tutor-facing frontend logic — ready for UJ, UP, WITS tutor pages.

STRUCTURE
1) Integration notes
2) Backend integration points (to replace fakeServer)
3) Full JS Implementation — all UI and localStorage logic.

-----------------------
GITHUB / DEPLOY STEPS
-----------------------
1. Save as tutor-app.js in your project root.
2. Add <script src="./tutor-app.js" defer></script> at the bottom of each *tutor* page (e.g. uj-tutor.html).
3. Commit & push:
   git add tutor-app.js
   git commit -m "Add tutor frontend logic (profile, requests, sessions)"
   git push
4. Open uj-tutor.html etc — dashboard replaces the welcome area automatically.

-----------------------
BACKEND INTEGRATION (later)
-----------------------
fakeServer.loginTutor()         → POST /api/tutor/login
fakeServer.registerTutor()      → POST /api/tutors
fakeServer.fetchTutorRequests() → GET /api/tutors/:id/requests
fakeServer.updateRequest()      → PATCH /api/requests/:id
fakeServer.submitReport()       → POST /api/reports
fakeServer.toggleAvailability() → PATCH /api/tutors/:id/availability
fakeServer.fetchRatings()       → GET /api/tutors/:id/ratings
-----------------------
*/

(function(){
  'use strict';

  const APP_NAMESPACE = 'uni-help-tutor';

  // Helper functions
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
  function isTutorPage(){
    const filename = window.location.pathname.toLowerCase();
    return filename.includes('-tutor')||filename.includes('tutor');
  }
  function formatDateTime(dt){
    if(!dt) return '';
    return new Date(dt).toLocaleString();
  }

  // ---------------- FAKE SERVER ----------------
  const fakeServer = {
    registerTutor(profile){
      return new Promise(res=>{
        const tutors = loadState('tutors', {});
        profile.id = profile.id || uid('tutor-');
        tutors[profile.id] = profile;
        saveState('tutors', tutors);
        res({ok:true,tutor:profile});
      });
    },
    loginTutor(credentials){
      return new Promise(res=>{
        const tutors = loadState('tutors', {});
        const found = Object.values(tutors).find(t=>
          (t.email===credentials.email||t.tutorNumber===credentials.tutorNumber)
        );
        if(found && (!credentials.password || found.password===credentials.password))
          res({ok:true,tutor:found});
        else res({ok:false,error:'Invalid credentials'});
      });
    },
    fetchTutorRequests(tutorId){
      return new Promise(res=>{
        const requests = loadState('requests', []).filter(r=>r.providerId===tutorId);
        res(requests);
      });
    },
    updateRequest(requestId, patch){
      return new Promise(res=>{
        const requests = loadState('requests', []);
        const idx = requests.findIndex(r=>r.id===requestId);
        if(idx===-1) return res({ok:false});
        requests[idx] = Object.assign(requests[idx], patch);
        saveState('requests', requests);
        res({ok:true,request:requests[idx]});
      });
    },
    submitReport(report){
      return new Promise(res=>{
        const reports = loadState('reports', []);
        reports.push(report);
        saveState('reports', reports);
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
    fetchRatings(tutorId){
      return new Promise(res=>{
        const requests = loadState('requests', []);
        const ratings = requests.filter(r=>r.providerId===tutorId && r.rating)
          .map(r=>({studentName:r.studentName,rating:r.rating,comment:r.comment}));
        res(ratings);
      });
    }
  };

  // ---------------- UI BUILDERS ----------------
  function createDashboardRoot(){
    const welcome = findWelcomeNode();
    const container = el('div',{class:'tutor-dashboard-root',style:{width:'100%',display:'flex',justifyContent:'center',alignItems:'center',padding:'20px',boxSizing:'border-box'}});
    const inner = el('div',{class:'tutor-dashboard',style:{width:'100%',maxWidth:'1100px',backgroundColor:'rgba(255,255,255,0.95)',borderRadius:'12px',boxShadow:'0 6px 24px rgba(0,0,0,0.12)',padding:'18px',color:'#111'}});
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

  function buildHeader(root, tutor){
    const header = el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}});
    const left = el('div',{style:{display:'flex',alignItems:'center',gap:'10px'}},[
      el('div',{style:{fontWeight:'700',fontSize:'18px'}},`Welcome ${tutor?tutor.name||'Tutor':''}`),
      el('div',{style:{fontSize:'12px',color:'#444'}},tutor?tutor.email||'':'Login to access dashboard')
    ]);
    const right = el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}});
    const availSwitch = el('button',{style:{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ccc',cursor:'pointer',background:tutor&&tutor.availableNow?'#117a37':'#fff',color:tutor&&tutor.availableNow?'#fff':'#111'}},tutor&&tutor.availableNow?'Available Now':'Set Available');
    const profileBtn = el('button',{style:{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ccc',cursor:'pointer'}},'Profile');
    const logoutBtn = el('button',{style:{padding:'8px 12px',borderRadius:'8px',background:'#b22222',color:'#fff',border:'none',cursor:'pointer'}},'Logout');
    right.append(availSwitch,profileBtn,logoutBtn);
    header.append(left,right);

    profileBtn.onclick=()=>showProfileModal(tutor);
    logoutBtn.onclick=()=>{saveState('currentTutor',null);location.reload();};
    availSwitch.onclick=()=>{
      const t = loadState('currentTutor',null);
      if(!t) return showToast('Login first');
      t.availableNow = !t.availableNow;
      saveState('currentTutor',t);
      fakeServer.sendNotification({tutorId:t.id,title:`Availability set to ${t.availableNow?'ON':'OFF'}`});
      showToast(`Availability ${t.availableNow?'ON':'OFF'}`);
      location.reload();
    };

    root.appendChild(header);
  }

  function buildColumns(root,tutor){
    const grid = el('div',{style:{display:'grid',gridTemplateColumns:'320px 1fr 320px',gap:'12px',alignItems:'start'}});
    const left = el('div');
    const middle = el('div');
    const right = el('div');

    left.append(buildRequestsPanel(tutor));
    middle.append(buildSessionPanel(tutor));
    right.append(buildRatingsPanel(tutor));
    right.append(buildNotificationsPanel(tutor));

    grid.append(left,middle,right);
    root.appendChild(grid);
  }

  // ---------------- PANELS ----------------
  function buildRequestsPanel(tutor){
    const panel = el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff'}});
    panel.append(el('h3',{},'Student Requests'));
    const list = el('div',{});
    panel.append(list);

    async function refresh(){
      if(!tutor) return list.textContent='Login to view requests';
      const reqs = await fakeServer.fetchTutorRequests(tutor.id);
      list.innerHTML='';
      if(!reqs.length) return list.textContent='No requests yet.';
      reqs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      reqs.forEach(r=>{
        const row = el('div',{style:{padding:'8px 4px',borderBottom:'1px solid #f2f2f2'}});
        row.append(el('div',{style:{fontWeight:'700'}},`${r.studentName} • ${r.module||r.type}`));
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
      await fakeServer.sendNotification({studentId:r.studentId,title:`Your request was ${status.toLowerCase()}`});
      showToast(`Request ${status}`);
      refresh();
    }
    function suggestTime(r){
      const input = prompt('Enter new suggested time (e.g. 2025-11-12T14:00)');
      if(!input) return;
      fakeServer.updateRequest(r.id,{suggestedTime:input,status:'Suggested'}).then(()=>{
        fakeServer.sendNotification({studentId:r.studentId,title:`Tutor suggested new time`});
        showToast('Suggested new time');
        refresh();
      });
    }

    setTimeout(refresh,60);
    return panel;
  }

  function buildSessionPanel(tutor){
    const panel = el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff'}});
    panel.append(el('h3',{},'Active / Upcoming Sessions'));
    const list = el('div',{});
    panel.append(list);

    async function refresh(){
      if(!tutor) return list.textContent='Login to view sessions';
      const reqs = await fakeServer.fetchTutorRequests(tutor.id);
      const active = reqs.filter(r=>r.status==='Approved');
      list.innerHTML='';
      if(!active.length) return list.textContent='No active sessions.';
      active.forEach(r=>{
        const row = el('div',{style:{padding:'8px 4px',borderBottom:'1px solid #f2f2f2'}});
        row.append(el('div',{style:{fontWeight:'700'}},`${r.studentName} (${r.module||r.type})`));
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

  function buildRatingsPanel(tutor){
    const panel = el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff',marginBottom:'12px'}});
    panel.append(el('h4',{},'Student Ratings'));
    const list = el('div',{});
    panel.append(list);
    async function refresh(){
      if(!tutor) return list.textContent='Login to see ratings';
      const ratings = await fakeServer.fetchRatings(tutor.id);
      list.innerHTML='';
      if(!ratings.length) return list.textContent='No ratings yet';
      const avg = (ratings.reduce((a,b)=>a+b.rating,0)/ratings.length).toFixed(1);
      panel.prepend(el('div',{style:{fontWeight:'700',marginBottom:'4px'}},`Average Rating: ${avg} ★`));
      ratings.forEach(r=>{
        list.append(el('div',{style:{padding:'6px 0',borderBottom:'1px solid #f2f2f2'}},[
          el('div',{style:{fontWeight:'600'}},`${r.studentName}`),
          el('div',{style:{fontSize:'13px',color:'#555'}},`${r.rating} ★ — ${r.comment||''}`)
        ]));
      });
    }
    setTimeout(refresh,60);
    return panel;
  }

  function buildNotificationsPanel(tutor){
    const panel = el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff',marginTop:'12px'}});
    panel.append(el('h4',{},'Notifications'));
    const list = el('div',{});
    panel.append(list);
    function refresh(){
      const notes = loadState('notifications',[]).filter(n=>!tutor||n.tutorId===tutor.id);
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
  function showProfileModal(tutor){
    const form = el('div',{});
    form.append(el('h3',{},tutor?'Edit Profile':'Create Profile'));
    const inputName = el('input',{placeholder:'Full Name',value:tutor?tutor.name:'',class:'input'});
    const inputSurname = el('input',{placeholder:'Surname',value:tutor?tutor.surname:'',class:'input'});
    const inputEmail = el('input',{placeholder:'Email',value:tutor?tutor.email:'',class:'input'});
    const inputBio = el('textarea',{placeholder:'Short bio',style:{width:'100%',minHeight:'60px'}},tutor?tutor.bio||'':'');
    const inputModules = el('input',{placeholder:'Modules taught (comma separated)',value:tutor?tutor.modules||'':'',class:'input'});
    const file = el('input',{type:'file',accept:'image/*'});
    const imgPrev = el('img',{src:tutor&&tutor.photo?tutor.photo:'',style:{width:'78px',height:'78px',objectFit:'cover',borderRadius:'8px',display:tutor&&tutor.photo?'block':'none'}});
    const btnSave = el('button',{style:{marginTop:'12px',padding:'8px 12px',cursor:'pointer'}},'Save');

    form.append(imgPrev,file,inputName,inputSurname,inputEmail,inputBio,inputModules,btnSave);

    const modal = showModal(form);
    file.onchange=(e)=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=()=>{imgPrev.src=r.result;imgPrev.style.display='block';};
      r.readAsDataURL(f);
    };
    btnSave.onclick=async()=>{
      const profile={
        id:tutor?tutor.id:undefined,
        name:inputName.value.trim(),
        surname:inputSurname.value.trim(),
        email:inputEmail.value.trim(),
        bio:inputBio.value.trim(),
        modules:inputModules.value.trim(),
        photo:imgPrev.src||undefined,
        availableNow:false
      };
      const res=await fakeServer.registerTutor(profile);
      if(res.ok){
        saveState('currentTutor',res.tutor);
        showToast('Profile saved');
        modal.remove();
        location.reload();
      }
    };
  }

  function openSessionModal(request){
    const form = el('div',{});
    form.append(el('h3',{},`Session with ${request.studentName}`));
    form.append(el('p',{},`${formatDateTime(request.datetime)} | ${request.mode}`));
    const inputLink = el('input',{placeholder:'Meeting link or location',style:{width:'100%'}});
    const inputReport = el('textarea',{placeholder:'Post-session notes',style:{width:'100%',minHeight:'80px',marginTop:'6px'}});
    const btnSubmit = el('button',{style:{marginTop:'10px',padding:'8px 12px'}},'Submit Report');
    form.append(inputLink,inputReport,btnSubmit);
    const modal = showModal(form);
    btnSubmit.onclick=async()=>{
      await fakeServer.submitReport({
        requestId:request.id,
        link:inputLink.value,
        report:inputReport.value,
        tutorId:request.providerId
      });
      await fakeServer.updateRequest(request.id,{status:'Completed'});
      showToast('Report submitted');
      modal.remove();
      location.reload();
    };
  }

  function showModal(content){
    const overlay=el('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:10000}});
    const box=el('div',{style:{background:'#fff',padding:'18px',borderRadius:'8px',width:'min(400px,90%)',maxHeight:'90vh',overflowY:'auto'}});
    const closeBtn=el('button',{style:{position:'absolute',top:'8px',right:'10px',cursor:'pointer'}},'✕');
    closeBtn.onclick=()=>overlay.remove();
    box.append(closeBtn,content);
    overlay.append(box);
    document.body.appendChild(overlay);
    return overlay;
  }

  function showToast(msg){
    const div=el('div',{style:{position:'fixed',bottom:'18px',left:'50%',transform:'translateX(-50%)',background:'#222',color:'#fff',padding:'10px 18px',borderRadius:'6px',zIndex:9999,transition:'opacity 0.3s'}},msg);
    document.body.appendChild(div);
    setTimeout(()=>div.style.opacity='0',2200);
    setTimeout(()=>div.remove(),2600);
  }

  // ---------------- INIT ----------------
  function init(){
    if(!isTutorPage()) return;

    const tutor = loadState('currentTutor',null);
    const root = createDashboardRoot();
    if(!tutor){
      const login = el('div',{style:{textAlign:'center'}},[
        el('h3',{},'Tutor Login / Register'),
        el('input',{placeholder:'Email or Tutor Number',style:{width:'80%',margin:'6px'}}),
        el('input',{type:'password',placeholder:'Password',style:{width:'80%',margin:'6px'}}),
        el('div',{},[
          el('button',{style:{margin:'6px',padding:'6px 10px'}},'Login'),
          el('button',{style:{margin:'6px',padding:'6px 10px'}},'Register')
        ])
      ]);
      const [inpUser,inpPass]=login.querySelectorAll('input');
      const [btnLogin,btnReg]=login.querySelectorAll('button');
      root.append(login);
      btnLogin.onclick=async()=>{
        const res=await fakeServer.loginTutor({email:inpUser.value,tutorNumber:inpUser.value,password:inpPass.value});
        if(res.ok){saveState('currentTutor',res.tutor);location.reload();}
        else showToast('Invalid credentials');
      };
      btnReg.onclick=()=>showProfileModal(null);
      return;
    }

    buildHeader(root,tutor);
    buildColumns(root,tutor);
  }

  document.addEventListener('DOMContentLoaded',init);

})();


