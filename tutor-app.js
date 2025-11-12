/*
=====================================================
 TUTOR PORTAL FRONTEND (UJ / UP / WITS)
 Enhanced Tutor Dashboard (Bootstrap 5 styled)
=====================================================
 - No backend required (uses localStorage via fakeServer)
 - Ready for /api integration
 - Includes ALL requested tutor features
=====================================================
*/

(function(){
  'use strict';

  const APP_NAMESPACE = 'uni-help-tutor';
  const version = '2.0';

  // ---------- Helpers ----------
  const qs = (sel,root=document)=>root.querySelector(sel);
  const qsa = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const el = (tag,attrs={},children=[])=>{
    const node = document.createElement(tag);
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
  };
  const uid=(p='')=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const saveState=(k,v)=>{
    const store=JSON.parse(localStorage.getItem(APP_NAMESPACE)||'{}');
    store[k]=v; localStorage.setItem(APP_NAMESPACE,JSON.stringify(store));
  };
  const loadState=(k,def=null)=>{
    const store=JSON.parse(localStorage.getItem(APP_NAMESPACE)||'{}');
    return store[k]!==undefined?store[k]:def;
  };
  const formatDate=(dt)=>dt?new Date(dt).toLocaleString():'';  

  // ---------- FakeServer (localStorage simulation) ----------
  const fakeServer={
    registerTutor(profile){
      return new Promise(res=>{
        const tutors=loadState('tutors',{}); 
        profile.id=profile.id||uid('tutor-');
        tutors[profile.id]=profile; 
        saveState('tutors',tutors);
        res({ok:true,tutor:profile});
      });
    },
    loginTutor(credentials){
      return new Promise(res=>{
        const tutors=loadState('tutors',{});
        const found=Object.values(tutors).find(t=>
          (t.email===credentials.email||t.tutorNumber===credentials.tutorNumber)
        );
        if(found && (!credentials.password||found.password===credentials.password))
          res({ok:true,tutor:found});
        else res({ok:false,error:'Invalid credentials'});
      });
    },
    fetchTutorRequests(tutorId){
      return new Promise(res=>{
        const reqs=loadState('requests',[]).filter(r=>r.providerId===tutorId);
        res(reqs);
      });
    },
    updateRequest(id,patch){
      return new Promise(res=>{
        const reqs=loadState('requests',[]);
        const i=reqs.findIndex(r=>r.id===id);
        if(i===-1)return res({ok:false});
        reqs[i]=Object.assign(reqs[i],patch);
        saveState('requests',reqs);
        res({ok:true,request:reqs[i]});
      });
    },
    submitReport(report){
      return new Promise(res=>{
        const reports=loadState('reports',[]);
        reports.push(report); saveState('reports',reports);
        res({ok:true});
      });
    },
    sendNotification(note){
      return new Promise(res=>{
        const notes=loadState('notifications',[]);
        note.id=uid('note-'); note.createdAt=new Date().toISOString();
        notes.push(note); saveState('notifications',notes);
        res({ok:true});
      });
    },
    fetchRatings(tutorId){
      return new Promise(res=>{
        const reqs=loadState('requests',[]);
        const ratings=reqs.filter(r=>r.providerId===tutorId && r.rating)
          .map(r=>({studentName:r.studentName,rating:r.rating,comment:r.comment}));
        res(ratings);
      });
    },
    saveVideos(tutorId,videos){
      const all=loadState('videos',{});
      all[tutorId]=videos; saveState('videos',all);
    },
    fetchVideos(tutorId){
      const all=loadState('videos',{}); return all[tutorId]||[];
    }
  };

  // ---------- UI Building ----------
  function createRoot(){
    const wrap=el('div',{class:'container my-4 tutor-dashboard'});
    const main=el('div',{class:'bg-light p-4 rounded shadow-sm'});
    wrap.append(main); 
    const old=findWelcome();
    if(old&&old.parentNode) old.parentNode.replaceChild(wrap,old);
    else document.body.appendChild(wrap);
    return main;
  }
  function findWelcome(){
    const nodes=qsa('body *');
    return nodes.find(n=>(n.textContent||'').toLowerCase().includes('welcome'));
  }
  function showToast(msg,type='info'){
    const t=el('div',{class:`toast align-items-center text-bg-${type} border-0 show`,
      style:{position:'fixed',bottom:'20px',right:'20px',zIndex:9999,padding:'8px 16px',borderRadius:'6px'}},msg);
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
  }
  function showModal(title,body){
    const overlay=el('div',{class:'modal fade show',style:{display:'block',background:'rgba(0,0,0,0.6)',zIndex:9998}});
    const dialog=el('div',{class:'modal-dialog modal-dialog-centered'});
    const content=el('div',{class:'modal-content'});
    const header=el('div',{class:'modal-header'},[
      el('h5',{class:'modal-title'},title),
      el('button',{class:'btn-close',type:'button'})
    ]);
    const bodyDiv=el('div',{class:'modal-body'},body);
    content.append(header,bodyDiv); dialog.append(content); overlay.append(dialog);
    document.body.appendChild(overlay);
    qs('.btn-close',overlay).onclick=()=>overlay.remove();
    return overlay;
  }

  // ---------- Panels ----------
  function buildHeader(root,tutor){
    const row=el('div',{class:'d-flex justify-content-between align-items-center mb-3'});
    row.append(
      el('div',{},[
        el('h4',{class:'mb-0'},`Welcome ${tutor.name||''}`),
        el('small',{class:'text-muted'},tutor.email||'')
      ]),
      el('div',{class:'d-flex gap-2'},[
        el('button',{class:`btn ${tutor.availableNow?'btn-success':'btn-outline-success'}`},tutor.availableNow?'Available Now':'Set Available'),
        el('button',{class:'btn btn-outline-primary'},'Profile'),
        el('button',{class:'btn btn-danger'},'Logout')
      ])
    );
    const [avail,profile,logout]=row.querySelectorAll('button');
    avail.onclick=()=>{
      tutor.availableNow=!tutor.availableNow;
      saveState('currentTutor',tutor);
      fakeServer.sendNotification({tutorId:tutor.id,title:`Availability ${tutor.availableNow?'ON':'OFF'}`});
      showToast(`Availability ${tutor.availableNow?'ON':'OFF'}`,'success');
      location.reload();
    };
    profile.onclick=()=>showProfileModal(tutor);
    logout.onclick=()=>{saveState('currentTutor',null);location.reload();};
    root.append(row);
  }

  function buildDashboard(root,tutor){
    const grid=el('div',{class:'row g-3'});
    const col1=el('div',{class:'col-md-4'});
    const col2=el('div',{class:'col-md-5'});
    const col3=el('div',{class:'col-md-3'});
    col1.append(buildRequestsPanel(tutor),buildFollowupPanel(tutor));
    col2.append(buildSessionPanel(tutor),buildVideoPanel(tutor));
    col3.append(buildRatingsPanel(tutor),buildNotificationsPanel(tutor));
    grid.append(col1,col2,col3);
    root.append(grid);
  }

  // --- Requests Panel ---
  function buildRequestsPanel(tutor){
    const card=el('div',{class:'card'},[
      el('div',{class:'card-header bg-primary text-white'},'Student Requests'),
      el('div',{class:'list-group list-group-flush'})
    ]);
    const list=qs('.list-group',card);
    async function refresh(){
      const reqs=await fakeServer.fetchTutorRequests(tutor.id);
      list.innerHTML='';
      if(!reqs.length)return list.append(el('div',{class:'list-group-item'},'No requests yet.'));
      reqs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      reqs.forEach(r=>{
        const item=el('div',{class:'list-group-item'},[
          el('div',{class:'fw-bold'},`${r.studentName} • ${r.module||r.type}`),
          el('small',{class:'text-muted'},`Pref: ${formatDate(r.datetime)} | ${r.mode} | ${r.status}`),
          el('div',{class:'mt-2 d-flex gap-2'},[
            el('button',{class:'btn btn-sm btn-success'},'Approve'),
            el('button',{class:'btn btn-sm btn-danger'},'Reject'),
            el('button',{class:'btn btn-sm btn-outline-secondary'},'Suggest')
          ])
        ]);
        const [a,b,c]=item.querySelectorAll('button');
        a.onclick=()=>update(r,'Approved');
        b.onclick=()=>update(r,'Declined');
        c.onclick=()=>suggest(r);
        list.append(item);
      });
    }
    function update(r,status){
      fakeServer.updateRequest(r.id,{status}).then(()=>{
        fakeServer.sendNotification({studentId:r.studentId,title:`Request ${status}`});
        showToast(`Request ${status}`,'success'); refresh();
      });
    }
    function suggest(r){
      const input=prompt('Enter new time (YYYY-MM-DDTHH:mm)');
      if(!input)return;
      fakeServer.updateRequest(r.id,{suggestedTime:input,status:'Suggested'}).then(()=>{
        fakeServer.sendNotification({studentId:r.studentId,title:'Tutor suggested new time'});
        showToast('Time suggested','info'); refresh();
      });
    }
    refresh();
    return card;
  }

  // --- Sessions Panel ---
  function buildSessionPanel(tutor){
    const card=el('div',{class:'card mb-3'},[
      el('div',{class:'card-header bg-success text-white'},'Active / Upcoming Sessions'),
      el('div',{class:'list-group list-group-flush'})
    ]);
    const list=qs('.list-group',card);
    async function refresh(){
      const reqs=await fakeServer.fetchTutorRequests(tutor.id);
      const active=reqs.filter(r=>r.status==='Approved');
      list.innerHTML='';
      if(!active.length)return list.append(el('div',{class:'list-group-item'},'No sessions.'));
      active.forEach(r=>{
        const it=el('div',{class:'list-group-item'},[
          el('div',{class:'fw-bold'},`${r.studentName} (${r.module})`),
          el('small',{class:'text-muted'},formatDate(r.datetime)+' • '+r.mode),
          el('div',{class:'mt-2'},[
            el('button',{class:'btn btn-sm btn-primary me-2'},'Join / Host'),
            el('button',{class:'btn btn-sm btn-outline-secondary'},'Report')
          ])
        ]);
        const [join,rep]=it.querySelectorAll('button');
        join.onclick=()=>joinSession(r);
        rep.onclick=()=>reportSession(r);
        list.append(it);
      });
    }
    function joinSession(r){
      const links={
        zoom:`https://zoom.us/join`,
        teams:`https://teams.microsoft.com/l/meetup-join/`,
        meet:`https://meet.google.com/`
      };
      const linkChoice=prompt('Enter or choose platform: zoom / teams / meet');
      const url=links[linkChoice]||linkChoice||'https://zoom.us/join';
      window.open(url,'_blank');
      showToast('Session opened','info');
    }
    function reportSession(r){openReportModal(r);}
    refresh();
    return card;
  }

  // --- Ratings Panel ---
  function buildRatingsPanel(tutor){
    const card=el('div',{class:'card mb-3'},[
      el('div',{class:'card-header bg-warning'},'Student Ratings'),
      el('div',{class:'list-group list-group-flush'})
    ]);
    const list=qs('.list-group',card);
    async function refresh(){
      const ratings=await fakeServer.fetchRatings(tutor.id);
      list.innerHTML='';
      if(!ratings.length)return list.append(el('div',{class:'list-group-item'},'No ratings yet.'));
      const avg=(ratings.reduce((a,b)=>a+b.rating,0)/ratings.length).toFixed(1);
      list.append(el('div',{class:'list-group-item active'},`Average Rating: ${avg} ★`));
      ratings.forEach(r=>{
        list.append(el('div',{class:'list-group-item'},[
          el('div',{class:'fw-bold'},r.studentName),
          el('small',{},`${r.rating} ★ — ${r.comment||''}`)
        ]));
      });
    }
    refresh();
    return card;
  }

  // --- Notifications ---
  function buildNotificationsPanel(tutor){
    const card=el('div',{class:'card'},[
      el('div',{class:'card-header bg-info text-white'},'Notifications'),
      el('div',{class:'list-group list-group-flush'})
    ]);
    const list=qs('.list-group',card);
    function refresh(){
      const notes=loadState('notifications',[]).filter(n=>!tutor||n.tutorId===tutor.id);
      list.innerHTML='';
      if(!notes.length)return list.append(el('div',{class:'list-group-item'},'No notifications'));
      notes.slice().reverse().forEach(n=>{
        list.append(el('div',{class:'list-group-item'},[
          el('div',{class:'fw-bold'},n.title),
          el('small',{class:'text-muted'},formatDate(n.createdAt))
        ]));
      });
    }
    refresh();
    return card;
  }

  // --- Follow-Up Scheduling ---
  function buildFollowupPanel(tutor){
    const card=el('div',{class:'card mt-3'},[
      el('div',{class:'card-header bg-secondary text-white'},'Follow-Up Sessions'),
      el('div',{class:'list-group list-group-flush'},[
        el('div',{class:'list-group-item'},'Schedule follow-up from reports below.')
      ])
    ]);
    return card;
  }

  // --- Video Upload / Library ---
  function buildVideoPanel(tutor){
    const card=el('div',{class:'card mb-3'},[
      el('div',{class:'card-header bg-dark text-white d-flex justify-content-between'},[
        el('span',{},'Lesson Videos'),
        el('button',{class:'btn btn-sm btn-light'},'Add Video')
      ]),
      el('div',{class:'list-group list-group-flush'})
    ]);
    const list=qs('.list-group',card);
    const addBtn=qs('button',card);
    function refresh(){
      const vids=fakeServer.fetchVideos(tutor.id);
      list.innerHTML='';
      if(!vids.length)return list.append(el('div',{class:'list-group-item'},'No videos uploaded.'));
      vids.forEach(v=>{
        list.append(el('div',{class:'list-group-item'},[
          el('div',{class:'fw-bold'},v.title),
          el('small',{},v.module||''),
          el('div',{class:'mt-2'},[
            el('a',{href:v.url,target:'_blank',class:'btn btn-sm btn-outline-primary me-2'},'Open'),
            el('button',{class:'btn btn-sm btn-danger'},'Delete')
          ])
        ]));
      });
    }
    addBtn.onclick=()=>{
      const form=el('div',{},[
        el('input',{class:'form-control mb-2',placeholder:'Video Title'}),
        el('input',{class:'form-control mb-2',placeholder:'Module'}),
        el('input',{class:'form-control mb-2',placeholder:'YouTube / Video URL'}),
        el('textarea',{class:'form-control mb-2',placeholder:'Notes or quiz prompts'}),
        el('button',{class:'btn btn-primary'},'Save')
      ]);
      const [title,module,url,notes,save]=form.querySelectorAll('input,textarea,button');
      const modal=showModal('Upload Lesson Video',form);
      save.onclick=()=>{
        const vids=fakeServer.fetchVideos(tutor.id);
        vids.push({title:title.value,module:module.value,url:url.value,notes:notes.value});
        fakeServer.saveVideos(tutor.id,vids);
        showToast('Video added','success'); modal.remove(); refresh();
      };
    };
    refresh();
    return card;
  }

  // ---------- Modals ----------
  function showProfileModal(tutor){
    const form=el('div',{},[
      el('div',{class:'mb-2'},'Update your profile details:'),
      el('input',{class:'form-control mb-2',placeholder:'Full Name',value:tutor.name||''}),
      el('input',{class:'form-control mb-2',placeholder:'Surname',value:tutor.surname||''}),
      el('input',{class:'form-control mb-2',placeholder:'Email',value:tutor.email||''}),
      el('textarea',{class:'form-control mb-2',placeholder:'Short Bio',value:tutor.bio||''}),
      el('input',{class:'form-control mb-2',placeholder:'Modules (comma separated)',value:tutor.modules||''}),
      el('label',{class:'form-label'},'Weekly Availability (Mon–Fri):'),
      el('textarea',{class:'form-control mb-2',placeholder:'e.g., Monday 9–12, Wednesday 14–17',value:tutor.availability||''}),
      el('input',{type:'file',class:'form-control mb-2',accept:'image/*'}),
      el('img',{src:tutor.photo||'',style:{maxWidth:'100px',display:tutor.photo?'block':'none'}}),
      el('button',{class:'btn btn-success'},'Save')
    ]);
    const [name,surname,email,bio,modules,availText,file,img,save]=form.querySelectorAll('input,textarea,img,button');
    file.onchange=(e)=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=()=>{img.src=r.result;img.style.display='block';};
      r.readAsDataURL(f);
    };
    const modal=showModal('Tutor Profile',form);
    save.onclick=async()=>{
      const profile={
        id:tutor.id,name:name.value,surname:surname.value,email:email.value,bio:bio.value,
        modules:modules.value,availability:availText.value,photo:img.src,availableNow:false
      };
      const res=await fakeServer.registerTutor(profile);
      if(res.ok){saveState('currentTutor',res.tutor);showToast('Profile saved','success');modal.remove();location.reload();}
    };
  }

  function openReportModal(request){
    const form=el('div',{},[
      el('textarea',{class:'form-control mb-2',placeholder:'Session summary / topics covered'}),
      el('textarea',{class:'form-control mb-2',placeholder:'Follow-up actions'}),
      el('button',{class:'btn btn-primary'},'Submit Report')
    ]);
    const [summary,follow,save]=form.querySelectorAll('textarea,button');
    const modal=showModal(`Session Report: ${request.studentName}`,form);
    save.onclick=async()=>{
      await fakeServer.submitReport({requestId:request.id,tutorId:request.providerId,summary:summary.value,followup:follow.value});
      await fakeServer.updateRequest(request.id,{status:'Completed'});
      fakeServer.sendNotification({studentId:request.studentId,title:'Session report submitted'});
      showToast('Report submitted','success'); modal.remove(); location.reload();
    };
  }

  // ---------- Init ----------
  function init(){
    const tutor=loadState('currentTutor',null);
    if(!tutorPage()) return;
    const root=createRoot();
    if(!tutor){
      const login=el('div',{class:'text-center'},[
        el('h4',{},'Tutor Login / Register'),
        el('input',{class:'form-control mb-2',placeholder:'Email or Tutor Number',style:{maxWidth:'300px',margin:'0 auto'}}),
        el('input',{class:'form-control mb-2',type:'password',placeholder:'Password',style:{maxWidth:'300px',margin:'0 auto'}}),
        el('div',{class:'d-flex justify-content-center gap-2'},[
          el('button',{class:'btn btn-primary'},'Login'),
          el('button',{class:'btn btn-outline-secondary'},'Register')
        ])
      ]);
      const [user,pass,btnLogin,btnReg]=[...login.querySelectorAll('input,button')];
      root.append(login);
      btnLogin.onclick=async()=>{
        const res=await fakeServer.loginTutor({email:user.value,tutorNumber:user.value,password:pass.value});
        if(res.ok){saveState('currentTutor',res.tutor);location.reload();}
        else showToast('Invalid credentials','danger');
      };
      btnReg.onclick=()=>showProfileModal({});
      return;
    }
    buildHeader(root,tutor);
    buildDashboard(root,tutor);
  }

  function tutorPage(){
    const path=window.location.pathname.toLowerCase();
    return path.includes('tutor');
  }

  document.addEventListener('DOMContentLoaded',init);

})();



