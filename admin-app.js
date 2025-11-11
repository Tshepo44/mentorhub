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
2. Add <script src="./admin-app.js" defer></script> at the bottom of each admin page (e.g. uj-admin.html).
3. Commit & push:
   git add admin-app.js
   git commit -m "Add admin dashboard logic (overview, users, reports, ratings, activity)"
   git push
4. Open uj-admin.html etc — dashboard replaces the welcome area automatically.

-----------------------
BACKEND INTEGRATION (later)
-----------------------
fakeServer.loginAdmin()           → POST /api/admin/login
fakeServer.fetchStats()           → GET /api/admin/stats
fakeServer.fetchUsers()           → GET /api/admin/users
fakeServer.deleteUser()           → DELETE /api/admin/users/:id
fakeServer.suspendUser()          → PATCH /api/admin/users/:id/suspend
fakeServer.generateReport()       → GET /api/admin/reports?type=&from=&to=
fakeServer.fetchRatings()         → GET /api/admin/ratings
fakeServer.fetchActivity()        → GET /api/admin/activity
fakeServer.exportReport()         → GET /api/admin/reports/export
-----------------------
*/

(function(){
  'use strict';

  const APP_NAMESPACE = 'uni-help-admin';

  // ---------------- Helpers ----------------
  function qs(sel,root=document){return root.querySelector(sel);}
  function qsa(sel,root=document){return Array.from(root.querySelectorAll(sel));}
  function el(tag,attrs={},children=[]){
    const node=document.createElement(tag);
    for(const k in attrs){
      if(k==='class')node.className=attrs[k];
      else if(k==='style')Object.assign(node.style,attrs[k]);
      else node.setAttribute(k,attrs[k]);
    }
    (Array.isArray(children)?children:[children]).forEach(c=>{
      if(typeof c==='string')node.appendChild(document.createTextNode(c));
      else if(c instanceof Node)node.appendChild(c);
    });
    return node;
  }
  function uid(prefix=''){return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
  function saveState(k,v){const s=JSON.parse(localStorage.getItem(APP_NAMESPACE)||'{}');s[k]=v;localStorage.setItem(APP_NAMESPACE,JSON.stringify(s));}
  function loadState(k,d=null){const s=JSON.parse(localStorage.getItem(APP_NAMESPACE)||'{}');return s[k]!==undefined?s[k]:d;}
  function isAdminPage(){const p=window.location.pathname.toLowerCase();return p.includes('admin');}
  function formatDateTime(dt){if(!dt)return'';return new Date(dt).toLocaleString();}
  function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}

  // ---------------- FAKE SERVER ----------------
  const fakeServer={
    loginAdmin(creds){
      return new Promise(res=>{
        const admin=loadState('adminAccount',{email:'admin@unihelp.ac.za',password:'admin123',name:'Admin'});
        if(creds.email===admin.email && creds.password===admin.password)
          res({ok:true,admin});
        else res({ok:false,error:'Invalid credentials'});
      });
    },
    fetchStats(){
      return new Promise(res=>{
        const tutorReqs=loadState('requests',[]);
        const counsReqs=loadState('counsellorRequests',[]);
        const all=[...tutorReqs,...counsReqs];
        const total=all.length;
        const approved=all.filter(r=>r.status==='Approved').length;
        const rejected=all.filter(r=>r.status==='Declined').length;
        const pending=all.filter(r=>!r.status||r.status==='Pending').length;
        const ignored=all.filter(r=>r.status==='Ignored').length;
        res({ok:true,total,approved,rejected,pending,ignored});
      });
    },
    fetchUsers(){
      return new Promise(res=>{
        const tutors=Object.values(loadState('tutors',{}));
        const counsellors=Object.values(loadState('counsellors',{}));
        res({ok:true,tutors,counsellors});
      });
    },
    deleteUser(id){
      return new Promise(res=>{
        const tutors=loadState('tutors',{});const counsellors=loadState('counsellors',{});
        delete tutors[id];delete counsellors[id];
        saveState('tutors',tutors);saveState('counsellors',counsellors);
        res({ok:true});
      });
    },
    suspendUser(id){
      return new Promise(res=>{
        const tutors=loadState('tutors',{});const counsellors=loadState('counsellors',{});
        if(tutors[id])tutors[id].suspended=!tutors[id].suspended;
        if(counsellors[id])counsellors[id].suspended=!counsellors[id].suspended;
        saveState('tutors',tutors);saveState('counsellors',counsellors);
        res({ok:true});
      });
    },
    generateReport(type,from,to){
      return new Promise(res=>{
        const all=type==='tutoring'?loadState('requests',[]):loadState('counsellorRequests',[]);
        const filtered=all.filter(r=>{
          const d=new Date(r.createdAt||r.datetime);
          return (!from||d>=new Date(from))&&(!to||d<=new Date(to));
        });
        res({ok:true,report:filtered});
      });
    },
    fetchRatings(){
      return new Promise(res=>{
        const requests=loadState('requests',[]);
        const ratings=requests.filter(r=>r.rating)
          .map(r=>({type:'Tutor',name:r.providerName,rating:r.rating,comment:r.comment}));
        const cRequests=loadState('counsellorRequests',[]);
        cRequests.forEach(r=>{
          if(r.rating)ratings.push({type:'Counsellor',name:r.providerName,rating:r.rating,comment:r.comment});
        });
        res({ok:true,ratings});
      });
    },
    fetchActivity(){
      return new Promise(res=>{
        const tutors=Object.values(loadState('tutors',{}));
        const counsellors=Object.values(loadState('counsellors',{}));
        const all=[...tutors,...counsellors];
        const data=all.map(u=>({
          name:u.name,
          type:u.modules?'Tutor':'Counsellor',
          responseRate:rand(70,100),
          ignored:rand(0,5),
          sessionsHandled:rand(3,25)
        }));
        res({ok:true,data});
      });
    }
  };

  // ---------------- UI BUILDERS ----------------
  function createDashboardRoot(){
    const welcome=findWelcomeNode();
    const container=el('div',{class:'admin-dashboard-root',style:{width:'100%',display:'flex',justifyContent:'center',alignItems:'center',padding:'20px',boxSizing:'border-box'}});
    const inner=el('div',{class:'admin-dashboard',style:{width:'100%',maxWidth:'1200px',backgroundColor:'rgba(255,255,255,0.97)',borderRadius:'12px',boxShadow:'0 6px 24px rgba(0,0,0,0.12)',padding:'20px',color:'#111'}});
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

  function buildHeader(root,admin){
    const h=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}});
    const left=el('div',{style:{fontWeight:'700',fontSize:'18px'}},`Welcome ${admin?admin.name:''}`);
    const logout=el('button',{style:{padding:'8px 12px',borderRadius:'8px',background:'#b22222',color:'#fff',border:'none',cursor:'pointer'}},'Logout');
    logout.onclick=()=>{saveState('currentAdmin',null);location.reload();};
    h.append(left,logout);
    root.append(h);
  }

  function buildColumns(root,admin){
    const grid=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',alignItems:'start'}});
    const left=el('div'),right=el('div');
    left.append(buildStatsPanel(),buildUserPanel());
    right.append(buildReportsPanel(),buildRatingsPanel(),buildActivityPanel());
    grid.append(left,right);
    root.append(grid);
  }

  // ---------------- PANELS ----------------
  function buildStatsPanel(){
    const panel=el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff',marginBottom:'12px'}});
    panel.append(el('h3',{},'Dashboard Overview'));
    const stats=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px',textAlign:'center'}});
    panel.append(stats);
    fakeServer.fetchStats().then(res=>{
      if(!res.ok)return;
      stats.append(
        makeStat('Total',res.total),
        makeStat('Approved',res.approved,'#117a37'),
        makeStat('Rejected',res.rejected,'#b22222'),
        makeStat('Pending',res.pending,'#ffa500'),
        makeStat('Ignored',res.ignored,'#777')
      );
    });
    return panel;
  }
  function makeStat(label,value,color='#333'){
    return el('div',{style:{background:'#f9f9f9',padding:'8px',borderRadius:'6px'}},[
      el('div',{style:{fontWeight:'700',color}},value),
      el('div',{style:{fontSize:'12px'}},label)
    ]);
  }

  function buildUserPanel(){
    const panel=el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff',marginBottom:'12px'}});
    panel.append(el('h3',{},'Manage Users'));
    const list=el('div',{});panel.append(list);
    fakeServer.fetchUsers().then(res=>{
      if(!res.ok)return list.textContent='Failed to load';
      const all=[...res.tutors.map(u=>({...u,role:'Tutor'})),...res.counsellors.map(u=>({...u,role:'Counsellor'}))];
      if(!all.length)return list.textContent='No users yet.';
      all.forEach(u=>{
        const row=el('div',{style:{padding:'6px',borderBottom:'1px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}});
        const left=el('div',{},`${u.name} (${u.role})`);
        const actions=el('div',{style:{display:'flex',gap:'6px'}});
        const del=el('button',{style:{padding:'4px 8px',background:'#b22222',color:'#fff',border:'none',cursor:'pointer'}},'Delete');
        const sus=el('button',{style:{padding:'4px 8px',background:u.suspended?'#777':'#ffa500',color:'#fff',border:'none',cursor:'pointer'}},u.suspended?'Unsuspend':'Suspend');
        del.onclick=()=>{if(confirm('Delete user?'))fakeServer.deleteUser(u.id).then(()=>{showToast('Deleted');location.reload();});};
        sus.onclick=()=>{fakeServer.suspendUser(u.id).then(()=>{showToast('Updated');location.reload();});};
        actions.append(sus,del);row.append(left,actions);list.append(row);
      });
    });
    return panel;
  }

  function buildReportsPanel(){
    const panel=el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff',marginBottom:'12px'}});
    panel.append(el('h3',{},'Generate Reports'));
    const form=el('div',{style:{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}});
    const type=el('select',{},[
      el('option',{value:'tutoring'},'Tutoring Requests'),
      el('option',{value:'counselling'},'Counselling Requests')
    ]);
    const from=el('input',{type:'date'}),to=el('input',{type:'date'});
    const btn=el('button',{style:{padding:'6px 10px',cursor:'pointer'}},'Generate');
    const list=el('div',{style:{marginTop:'10px'}});
    form.append(type,from,to,btn);panel.append(form,list);
    btn.onclick=async()=>{
      const res=await fakeServer.generateReport(type.value,from.value,to.value);
      if(!res.ok)return showToast('Error');
      list.innerHTML='';
      if(!res.report.length)return list.textContent='No results';
      list.append(el('div',{style:{fontWeight:'600',marginBottom:'6px'}},`Found ${res.report.length} records`));
      res.report.forEach(r=>{
        list.append(el('div',{style:{padding:'6px 0',borderBottom:'1px solid #f0f0f0'}},[
          el('div',{style:{fontWeight:'600'}},`${r.studentName||'Anonymous'} → ${r.providerName||'Unknown'}`),
          el('div',{style:{fontSize:'12px',color:'#555'}},`${formatDateTime(r.datetime)} • ${r.status||'Pending'}`)
        ]));
      });
    };
    return panel;
  }

  function buildRatingsPanel(){
    const panel=el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff',marginBottom:'12px'}});
    panel.append(el('h3',{},'View Ratings & Feedback'));
    const list=el('div',{});
    panel.append(list);
    fakeServer.fetchRatings().then(res=>{
      if(!res.ok)return list.textContent='Error loading';
      if(!res.ratings.length)return list.textContent='No ratings yet.';
      res.ratings.forEach(r=>{
        list.append(el('div',{style:{padding:'6px 0',borderBottom:'1px solid #f0f0f0'}},[
          el('div',{style:{fontWeight:'600'}},`${r.name} (${r.type})`),
          el('div',{style:{fontSize:'13px',color:'#555'}},`${r.rating} ★ — ${r.comment||''}`)
        ]));
      });
    });
    return panel;
  }

  function buildActivityPanel(){
    const panel=el('div',{style:{padding:'12px',border:'1px solid #eee',borderRadius:'8px',background:'#fff'}});
    panel.append(el('h3',{},'Monitor Activity'));
    const list=el('div',{});
    panel.append(list);
    fakeServer.fetchActivity().then(res=>{
      if(!res.ok)return list.textContent='Error loading';
      const data=res.data.sort((a,b)=>b.sessionsHandled-a.sessionsHandled);
      data.forEach(d=>{
        list.append(el('div',{style:{padding:'6px 0',borderBottom:'1px solid #f0f0f0'}},[
          el('div',{style:{fontWeight:'600'}},`${d.name} (${d.type})`),
          el('div',{style:{fontSize:'13px',color:'#555'}},`Response: ${d.responseRate}% • Ignored: ${d.ignored} • Sessions: ${d.sessionsHandled}`)
        ]));
      });
    });
    return panel;
  }

  function showToast(msg){
    const div=el('div',{style:{position:'fixed',bottom:'18px',left:'50%',transform:'translateX(-50%)',background:'#222',color:'#fff',padding:'10px 18px',borderRadius:'6px',zIndex:9999,transition:'opacity 0.3s'}},msg);
    document.body.appendChild(div);
    setTimeout(()=>div.style.opacity='0',2200);
    setTimeout(()=>div.remove(),2600);
  }

  // ---------------- INIT ----------------
  function init(){
    if(!isAdminPage())return;
    const admin=loadState('currentAdmin',null);
    const root=createDashboardRoot();
    if(!admin){
      const login=el('div',{style:{textAlign:'center'}},[
        el('h3',{},'Admin Login'),
        el('input',{placeholder:'Email',style:{width:'80%',margin:'6px'}}),
        el('input',{type:'password',placeholder:'Password',style:{width:'80%',margin:'6px'}}),
        el('button',{style:{margin:'6px',padding:'6px 10px'}},'Login')
      ]);
      const [inpEmail,inpPass]=login.querySelectorAll('input');
      const btn=login.querySelector('button');
      root.append(login);
      btn.onclick=async()=>{
        const res=await fakeServer.loginAdmin({email:inpEmail.value,password:inpPass.value});
        if(res.ok){saveState('currentAdmin',res.admin);location.reload();}
        else showToast('Invalid credentials');
      };
      return;
    }
    buildHeader(root,admin);
    buildColumns(root,admin);
  }

  document.addEventListener('DOMContentLoaded',init);

})();
