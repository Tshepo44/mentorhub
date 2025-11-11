/*
counsellor-app.js
Counsellor-facing frontend logic — ready for UJ, UP, WITS counselling portal pages.

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
fakeServer.submitCounsellingReport() → POST /api/reports
fakeServer.toggleAvailability()      → PATCH /api/counsellors/:id/availability
fakeServer.fetchSchedule()           → GET /api/counsellors/:id/schedule
-----------------------
*/

(function(){
  'use strict';

  const APP_NAMESPACE = 'uni-help-counsellor';

  // ---------------- Helpers ----------------
  function qs(sel,root=document){return root.querySelector(sel);}
  function qsa(sel,root=document){return Array.from(root.querySelectorAll(sel));}
  function el(tag,attrs={},children=[]){
    const node=document.createElement(tag);
    for(const k in attrs){
      if(k==='class') node.className=attrs[k];
      else if(k==='style') Object.assign(node.style,attrs[k]);
      else node.setAttribute(k,attrs[k]);
    }
    (Array.isArray(children)?children:[children]).forEach(c=>{
      if(typeof c==='string') node.appendChild(document.createTextNode(c));
      else if(c instanceof Node) node.appendChild(c);
    });
    return node;
  }
  function uid(prefix=''){return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
  function saveState(k,v){const s=JSON.parse(localStorage.getItem(APP_NAMESPACE)||'{}');s[k]=v;localStorage.setItem(APP_NAMESPACE,JSON.stringify(s));}
  function loadState(k,d=null){const s=JSON.parse(localStorage.getItem(APP_NAMESPACE)||'{}');return s[k]!==undefined?s[k]:d;}
  function isCounsellorPage(){const f=window.location.pathname.toLowerCase();return f.includes('counsellor');}
  function formatDateTime(dt){if(!dt)return'';return new Date(dt).toLocaleString();}

  // ---------------- FAKE SERVER ----------------
  const fakeServer={
    registerCounsellor(profile){
      return new Promise(res=>{
        const store=loadState('counsellors',{});
        profile.id=profile.id||uid('counsellor-');
        store[profile.id]=profile;
        saveState('counsellors',store);
        res({ok:true,counsellor:profile});
      });
    },
    loginCounsellor(creds){
      return new Promise(res=>{
        const store=loadState('counsellors',{});
        const found=Object.values(store).find(c=>
          (c.email===creds.email||c.staffNumber===creds.staffNumber)
        );
        if(found && (!creds.password || found.password===creds.password))
          res({ok:true,counsellor:found});
        else res({ok:false,error:'Invalid credentials'});
      });
    },
    fetchCounsellorRequests(id){
      return new Promise(res=>{
        const reqs=loadState('counsellorRequests',[]).filter(r=>r.providerId===id);
        res(reqs);
      });
    },
    updateRequest(id,patch){
      return new Promise(res=>{
        const reqs=loadState('counsellorRequests',[]);
        const i=reqs.findIndex(r=>r.id===id);
        if(i===-1)return res({ok:false});
        reqs[i]=Object.assign(reqs[i],patch);
        saveState('counsellorRequests',reqs);
        res({ok:true,request:reqs[i]});
      });
    },
    submitCounsellingReport(rep){
      return new Promise(res=>{
        const reps=loadState('counsellingReports',[]);
        reps.push(rep);
        saveState('counsellingReports',reps);
        res({ok:true});
      });
    },
    sendNotification(note){
      return new Promise(res=>{
        const notes=loadState('notifications',[]);
        note.id=uid('note-');note.createdAt=new Date().toISOString();
        notes.push(note);
        saveState('notifications',notes);
        res({ok:true});
      });
    },
    fetchSchedule(id){
      return new Promise(res=>{
        const reqs=loadState('counsellorRequests',[]).filter(r=>r.providerId===id && r.status==='Approved');
        res(reqs);
      });
    }
  };

  // ---------------- UI BUILDERS ----------------
  function createDashboardRoot(){
    const welcome=findWelcomeNode();
    const container=el('div',{class:'counsellor-dashboard-root',style:{width:'100%',display:'flex',justifyContent:'center',alignItems:'center',padding:'20px',boxSizing:'border-box'}});
    const inner=el('div',{class:'counsellor-dashboard',style:{width:'100%',maxWidth:'1100px',backgroundColor:'rgba(255,255,255,0.95)',borderRadius:'12px',boxShadow:'0 6px 24px rgba(0,0,0,0.12)',padding:'18px',color:'#111'}});
    container.append(inner);
    if(welcome&&welcome.parentNode)welcome.parentNode.replaceChild(container,welcome);
    else document.body.appendChild(container);
    return inner;
  }
  function findWelcomeNode(){
    const nodes=qsa('body *');
    for(const n of nodes){
      const txt=(n.textContent||'').toLowerCase();
      if(txt.includes('welcome')&&/center/.test(window.getComputedStyle(n).textAlign))return n;
    }
    return null;
  }

  function buildHeader(root,counsellor){
    const header=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}});
    const left=el('div',{style:{display:'flex',alignItems:'center',gap:'10px'}},[
      el('div',{style:{fontWeight:'700',fontSize:'18px'}},`Welcome ${counsellor?counsellor.name||'Counsellor':''}`),
      el('div',{style:{fontSize:'12px',color:'#444'}},counsellor?counsellor.email||'':'Login to access dashboard')
    ]);
    const right=el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}});
    const availBtn=el('button',{style:{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ccc',cursor:'pointer',background:counsellor&&counsellor.availableNow?'#117a37':'#fff',color:counsellor&&counsellor.availableNow?'#fff':'#111'}},counsellor&&counsellor.availableNow?'Available Now':'Set Available');
    const profileBtn=el('button',{style:{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ccc',cursor:'pointer'}},'Profile');
    const logoutBtn=el('button',{style:{padding:'8px 12px',borderRadius:'8px',background:'#b22222',color:'#fff',border:'none',cursor:'pointer'}},'Logout');
    right.append(availBtn,profileBtn,logoutBtn);
    header.append(left,right);
    profileBtn.onclick=()=>showProfileModal(counsellor);
    logoutBtn.onclick=()=>{saveState('currentCounsellor',null);location.reload();};
    availBtn.onclick=()=>{
      const c=loadState('currentCounsellor',null);
      if(!c)return showToast('Login first');
      c.availableNow=!c.availableNow;
      saveState('currentCounsellor',c);
      fakeServer.sendNotification({counsellorId:c.id,title:`Availability ${c.availableNow?'ON':'OFF'}`});
      showToast(`Availability ${c.availableNow?'ON':'OFF'}`);
      location.reload();
    };
    root.append(header);
  }

  function buildColumns(root,counsellor){
    const grid=el('div',{style:{display:'grid',gridTemplateColumns:'320px 1fr 320px',gap:'12px',alignItems:'start'}});
    const left=el('div'),middle=el('div'),right=el('div');
    left.append(buildRequestsPanel(counsellor));
    middle.append(buildSchedulePanel(counsellor));
    right.append(buildNotificationsPanel(counsellor));
    grid.append(left,middle,right);
    root.append(grid);
  }

  // ---------------- PANELS ----------------
  function buildRequestsPanel(counsellor){
    const panel=el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff'}});
    panel.append(el('h3',{},'Student Requests'));
    const list=el('div',{});panel.append(list);
    async function refresh(){
      if(!counsellor)return list.textContent='Login to view requests';
      const reqs=await fakeServer.fetchCounsellorRequests(counsellor.id);
      list.innerHTML='';
      if(!reqs.length)return list.textContent='No requests yet.';
      reqs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      reqs.forEach(r=>{
        const name=r.anonymous?'Anonymous Student':r.studentName;
        const row=el('div',{style:{padding:'8px 4px',borderBottom:'1px solid #f2f2f2'}});
        row.append(el('div',{style:{fontWeight:'700'}},`${name} • ${r.service||'General'}`));
        row.append(el('div',{style:{fontSize:'12px',color:'#555'}},`Pref time: ${formatDateTime(r.datetime)} | Mode: ${r.mode} | Status: ${r.status}`));
        const actions=el('div',{style:{marginTop:'6px',display:'flex',gap:'6px'}}),
          btnA=el('button',{style:{padding:'6px 8px'}},'Approve'),
          btnR=el('button',{style:{padding:'6px 8px',background:'#d9534f',color:'#fff',border:'none'}},'Reject'),
          btnS=el('button',{style:{padding:'6px 8px'}},'Reschedule');
        btnA.onclick=()=>updateStatus(r,'Approved');
        btnR.onclick=()=>updateStatus(r,'Declined');
        btnS.onclick=()=>reschedule(r);
        actions.append(btnA,btnR,btnS);
        row.append(actions);
        list.append(row);
      });
    }
    async function updateStatus(r,s){
      await fakeServer.updateRequest(r.id,{status:s});
      await fakeServer.sendNotification({studentId:r.studentId,title:`Your counselling request was ${s.toLowerCase()}`});
      showToast(`Request ${s}`);
      refresh();
    }
    function reschedule(r){
      const input=prompt('Enter new suggested time (e.g. 2025-11-12T14:00)');
      if(!input)return;
      fakeServer.updateRequest(r.id,{suggestedTime:input,status:'Rescheduled'}).then(()=>{
        fakeServer.sendNotification({studentId:r.studentId,title:'Counsellor suggested new time'});
        showToast('Rescheduled');
        refresh();
      });
    }
    setTimeout(refresh,60);
    return panel;
  }

  function buildSchedulePanel(counsellor){
    const panel=el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff'}});
    panel.append(el('h3',{},'Upcoming / Active Sessions'));
    const list=el('div',{});panel.append(list);
    async function refresh(){
      if(!counsellor)return list.textContent='Login to see sessions';
      const sessions=await fakeServer.fetchSchedule(counsellor.id);
      list.innerHTML='';
      if(!sessions.length)return list.textContent='No booked sessions.';
      sessions.forEach(s=>{
        const name=s.anonymous?'Anonymous Student':s.studentName;
        const row=el('div',{style:{padding:'8px 4px',borderBottom:'1px solid #f2f2f2'}});
        row.append(el('div',{style:{fontWeight:'700'}},`${name} (${s.service})`));
        row.append(el('div',{style:{fontSize:'12px',color:'#555'}},`${formatDateTime(s.datetime)} • ${s.mode}`));
        const btn=el('button',{style:{marginTop:'6px',padding:'6px 8px',cursor:'pointer'}},'Open / Report');
        btn.onclick=()=>openSessionModal(s);
        row.append(btn);
        list.append(row);
      });
    }
    setTimeout(refresh,60);
    return panel;
  }

  function buildNotificationsPanel(counsellor){
    const panel=el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff'}}),
          list=el('div',{});
    panel.append(el('h4',{},'Notifications'),list);
    function refresh(){
      const notes=loadState('notifications',[]).filter(n=>!counsellor||n.counsellorId===counsellor.id);
      list.innerHTML='';
      if(!notes.length)return list.textContent='No notifications';
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
    const form=el('div',{});form.append(el('h3',{},counsellor?'Edit Profile':'Create Profile'));
    const inputName=el('input',{placeholder:'Full Name',value:counsellor?counsellor.name:''}),
          inputEmail=el('input',{placeholder:'Email',value:counsellor?counsellor.email:''}),
          inputQual=el('input',{placeholder:'Qualifications',value:counsellor?counsellor.qualifications||'':''}),
          inputServices=el('input',{placeholder:'Services (e.g. Mental Health, Academic)',value:counsellor?counsellor.services||'':''}),
          inputAvail=el('textarea',{placeholder:'Weekly availability (e.g. Mon-Fri 9:00-16:00)',style:{width:'100%',minHeight:'60px'}},counsellor?counsellor.availability||'':''),
          file=el('input',{type:'file',accept:'image/*'}),
          imgPrev=el('img',{src:counsellor&&counsellor.photo?counsellor.photo:'',style:{width:'78px',height:'78px',objectFit:'cover',borderRadius:'8px',display:counsellor&&counsellor.photo?'block':'none'}}),
          btnSave=el('button',{style:{marginTop:'12px',padding:'8px 12px'}},'Save');
    form.append(imgPrev,file,inputName,inputEmail,inputQual,inputServices,inputAvail,btnSave);
    const modal=showModal(form);
    file.onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=()=>{imgPrev.src=r.result;imgPrev.style.display='block';};
      r.readAsDataURL(f);
    };
    btnSave.onclick=async()=>{
      const profile={
        id:counsellor?counsellor.id:undefined,
        name:inputName.value.trim(),
        email:inputEmail.value.trim(),
        qualifications:inputQual.value.trim(),
        services:inputServices.value.trim(),
        availability:inputAvail.value.trim(),
        photo:imgPrev.src||undefined,
        availableNow:false
      };
      const res=await fakeServer.registerCounsellor(profile);
      if(res.ok){
        saveState('currentCounsellor',res.counsellor);
        showToast('Profile saved');
        modal.remove();
        location.reload();
      }
    };
  }

  function openSessionModal(session){
    const form=el('div',{});form.append(el('h3',{},`Session with ${session.anonymous?'Anonymous Student':session.studentName}`));
    form.append(el('p',{},`${formatDateTime(session.datetime)} | ${session.mode}`));
    const inputLink=el('input',{placeholder:'Meeting link or location',style:{width:'100%'}}),
          inputReport=el('textarea',{placeholder:'Session notes & recommendations (private)',style:{width:'100%',minHeight:'80px',marginTop:'6px'}}),
          btnSubmit=el('button',{style:{marginTop:'10px',padding:'8px 12px'}},'Submit Report');
    form.append(inputLink,inputReport,btnSubmit);
    const modal=showModal(form);
    btnSubmit.onclick=async()=>{
      await fakeServer.submitCounsellingReport({
        sessionId:session.id,
        link:inputLink.value,
        report:inputReport.value,
        counsellorId:session.providerId
      });
      await fakeServer.updateRequest(session.id,{status:'Completed'});
      showToast('Report submitted (admin only)');
      modal.remove();
      location.reload();
    };
  }

  function showModal(content){
    const overlay=el('div',{style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:10000}});
    const box=el('div',{style:{background:'#fff',padding:'18px',borderRadius:'8px',width:'min(400px,90%)',maxHeight:'90vh',overflowY:'auto'}});
    const close=el('button',{style:{position:'absolute',top:'8px',right:'10px',cursor:'pointer'}},'✕');
    close.onclick=()=>overlay.remove();
    box.append(close,content);
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
    if(!isCounsellorPage())return;
    const counsellor=loadState('currentCounsellor',null);
    const root=createDashboardRoot();
    if(!counsellor){
      const login=el('div',{style:{textAlign:'center'}},[
        el('h3',{},'Counsellor Login / Register'),
        el('input',{placeholder:'Email or Staff Number',style:{width:'80%',margin:'6px'}}),
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
        const res=await fakeServer.loginCounsellor({email:inpUser.value,staffNumber:inpUser.value,password:inpPass.value});
        if(res.ok){saveState('currentCounsellor',res.counsellor);location.reload();}
        else showToast('Invalid credentials');
      };
      btnReg.onclick=()=>showProfileModal(null);
      return;
    }
    buildHeader(root,counsellor);
    buildColumns(root,counsellor);
  }

  document.addEventListener('DOMContentLoaded',init);

})();

