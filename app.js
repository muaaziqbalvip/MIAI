// ══════════════════════════════════════════════════════
// MI AI — CORE APPLICATION (Chat, Groq API, Firebase, Utilities)
// By Muaaz Iqbal | Muslim Islam Org
// FEATURES: 6-Key Rotation, Trading Hub, HTML Preview, PDF Fix
// Default chat model: compound-beta-mini
// Loads after: firebase, jspdf, jszip, marked, highlight.js
// Pairs with: call-assistant.js, gaming.js, music.js
// ══════════════════════════════════════════════════════

// ── API KEY ROTATION (6 keys) ──
const API_KEYS = [
  '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',
  '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',
  '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',
  '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',
  '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',
  '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'
];
let _ki = 0; // current key index
const _kf = {}; // fail counts
const GURL = 'https://api.groq.com/openai/v1/chat/completions';

function gKey(){ return API_KEYS[_ki]; }
function rotKey(fi){
  _kf[fi] = (_kf[fi]||0)+1;
  for(let i=1;i<=API_KEYS.length;i++){
    const nx=(_ki+i)%API_KEYS.length;
    if((_kf[nx]||0)<2){ _ki=nx; console.log('[MI AI] Key #'+(_ki+1)); return true; }
  }
  Object.keys(_kf).forEach(k=>_kf[k]=0); _ki=0; return false;
}

// ── FIREBASE ──
const FB={apiKey:"AIzaSyBbnU8DkthpYQMHOLLyj6M0cc05qXfjMcw",authDomain:"ramadan-2385b.firebaseapp.com",databaseURL:"https://ramadan-2385b-default-rtdb.firebaseio.com",projectId:"ramadan-2385b",storageBucket:"ramadan-2385b.firebasestorage.app",messagingSenderId:"882828936310",appId:"1:882828936310:web:7f97b921031fe130fe4b57"};
firebase.initializeApp(FB);
const auth=firebase.auth(),db=firebase.database();

// ── STATE ──
let CU=null,cid=null,hist=[],ufiles=[],isGen=false,abrt=null;
let mode='chat',mdl='compound-beta-mini',iSz='512x512';

// ── SYSTEM PROMPTS ──
const SYS={
  chat:`You are MI AI — Advanced Intelligence by Muaaz Iqbal (Muslim Islam Org). Brilliant, helpful, comprehensive. Use rich markdown.
RESPONSE LENGTH RULE: For simple greetings/questions (hi, what is X, yes/no): reply in 1-3 sentences. For medium topics: 1-3 paragraphs. For deep/complex/code requests: full detailed response, never truncate. Match length to complexity.
For code: full working implementation — 2000-5000+ lines when asked. No shortcuts. Begin Islamic answers with بِسْمِ اللَّهِ`,
  pro:`You are MI AI Pro Thinking by Muaaz Iqbal. Think step-by-step deeply. Show reasoning. Extremely detailed. Code: COMPLETE implementations — all functions, all edge cases. Never truncate.`,
  code:`You are MI AI Code Expert by Muaaz Iqbal — world's best programmer. ALWAYS write COMPLETE working code. NEVER use '...' or truncate. Write 2000-5000+ lines when asked. Full error handling, comments, tests. Expert in ALL languages.`,
  files:`You are MI AI File Analysis Expert by Muaaz Iqbal. Analyze any file: PDFs, images, ZIPs, code, CSV, JSON, Excel, Word. Provide comprehensive analysis, insights, statistics, recommendations.`,
  pdf:`You are MI AI Book Generator by Muaaz Iqbal. Create complete books — full chapters, detailed paragraphs, 500+ pages when needed. Professional structure. Islamic books: include Quran verses and hadith correctly.`,
  quran:`You are MI AI Islamic Knowledge by Muaaz Iqbal.\nبِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nExpert: Quran (all 114 surahs, full tafseer), Hadith (Bukhari, Muslim, Tirmidhi), Fiqh (all 4 madhabs), Islamic history, duas, prayer. Format: Arabic → transliteration → translation → explanation.`,
  web:`You are MI AI Web Research by Muaaz Iqbal. Comprehensive info on any topic. Multiple perspectives. Latest known information.`,
  voice:`You are MI AI Voice Assistant by Muaaz Iqbal. Clear, conversational, concise responses. Keep answers brief and natural for speech.`,
  quiz:`You are MI AI Quiz Generator by Muaaz Iqbal. Create comprehensive, educationally sound quizzes with clear questions and detailed answers.`,
  translate:`You are MI AI Translator by Muaaz Iqbal. Accurate, natural translations preserving meaning and tone.`,
  trading:`You are MI AI Trading Expert by Muaaz Iqbal (Muslim Islam Org). You are a professional financial educator and trading analyst. Expert in: Forex, Stocks, Crypto, Commodities trading. Provide detailed, practical trading education with examples. Format responses clearly with sections. Include risk warnings where appropriate. Be comprehensive but practical.`,
};
const MN={chat:'Smart Chat',pro:'Pro Thinking',code:'Code Expert',files:'File Analysis',pdf:'PDF Books',img:'Image Gen',quran:'Quran & Islam',dual:'Dual AI',web:'Web Search',voice:'Voice Chat',quiz:'Quiz',translate:'Translator',trading:'📈 Trading Hub'};

// ── AUTH ──
auth.onAuthStateChanged(u=>{if(u){CU=u;onLogin(u);}else{CU=null;onLogout();}});
function showErr(m){const e=document.getElementById('aerr');e.textContent=m;e.classList.add('show');}
function hideErr(){document.getElementById('aerr').classList.remove('show');}
function swTab(t){document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));document.querySelectorAll('.af').forEach(f=>f.classList.add('h'));document.querySelector('[onclick="swTab(\''+t+'\')"]').classList.add('on');document.getElementById(t+'-f').classList.remove('h');hideErr();}
async function doLogin(){hideErr();const em=document.getElementById('le').value.trim(),pw=document.getElementById('lp').value;if(!em||!pw){showErr('Fill all fields');return;}try{await auth.signInWithEmailAndPassword(em,pw);}catch(e){showErr({'auth/user-not-found':'No account found','auth/wrong-password':'Wrong password','auth/invalid-email':'Invalid email','auth/too-many-requests':'Too many attempts','auth/invalid-credential':'Invalid email or password'}[e.code]||'Login failed: '+e.message);}}
async function doReg(){hideErr();const nm=document.getElementById('rn').value.trim(),em=document.getElementById('re').value.trim(),pw=document.getElementById('rp').value;if(!nm||!em||!pw){showErr('Fill all fields');return;}if(pw.length<6){showErr('Password 6+ chars');return;}try{const c=await auth.createUserWithEmailAndPassword(em,pw);await c.user.updateProfile({displayName:nm});await db.ref('users/'+c.user.uid+'/profile').set({name:nm,email:em,createdAt:Date.now(),plan:'free'});}catch(e){showErr({'auth/email-already-in-use':'Email already registered','auth/weak-password':'Password too weak','auth/invalid-email':'Invalid email'}[e.code]||'Register failed: '+e.message);}}
async function doGoogle(){hideErr();try{const r=await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());const s=await db.ref('users/'+r.user.uid+'/profile').once('value');if(!s.exists())await db.ref('users/'+r.user.uid+'/profile').set({name:r.user.displayName||'User',email:r.user.email,createdAt:Date.now(),plan:'free'});}catch(e){showErr('Google login failed: '+e.message);}}
async function doLogout(){try{await auth.signOut();toast('Logged out','in');}catch(e){}}
function onLogin(u){hideSpl();document.getElementById('auth').classList.remove('show');document.getElementById('app').classList.add('show');const n=u.displayName||u.email.split('@')[0];document.getElementById('uname').textContent=n;document.getElementById('uemail').textContent=u.email;document.getElementById('uav').textContent=n.charAt(0).toUpperCase();ldHist();newChat();checkYTPermission();}
function onLogout(){document.getElementById('auth').classList.add('show');document.getElementById('app').classList.remove('show');cid=null;hist=[];}

// ── YOUTUBE DB — Admin controls video embedding ──
const YT_DB_PATH='mi_ai_settings/youtube';
let ytEnabled=false,ytAdminApproved=false;

async function checkYTPermission(){
  if(!CU)return false;
  try{
    const s=await db.ref(YT_DB_PATH+'/enabled').once('value');
    ytEnabled=!!s.val();
    const ua=await db.ref(YT_DB_PATH+'/approved_users/'+CU.uid).once('value');
    ytAdminApproved=!!ua.val();
  }catch(e){ytEnabled=true;}// default allow if db fails
  return ytEnabled;
}
async function requestYTPermission(){
  if(!CU)return;
  await db.ref(YT_DB_PATH+'/permission_requests/'+CU.uid).set({
    name:CU.displayName||'User',email:CU.email,ts:Date.now(),status:'pending'
  });
  toast('YouTube access requested — admin will approve','in');
}
async function adminToggleYT(enable){
  await db.ref(YT_DB_PATH+'/enabled').set(enable);
  toast('YouTube '+(enable?'enabled':'disabled'),'ok');
}

// ── CHAT PERSISTENCE ──
async function svMsg(role,content){if(!CU||!cid)return;try{const ref=db.ref('users/'+CU.uid+'/chats/'+cid);const m=await ref.child('meta').once('value');const safeContent=(content||'').substring(0,50).replace(/[#*`]/g,'');if(!m.exists())await ref.child('meta').set({title:safeContent,createdAt:Date.now(),updatedAt:Date.now(),mode,model:mdl});else await ref.child('meta/updatedAt').set(Date.now());await ref.child('messages').push({role,content:(content||'').substring(0,5000),ts:Date.now()});}catch(e){console.error('svMsg:',e);}}
async function ldHist(){if(!CU)return;try{const s=await db.ref('users/'+CU.uid+'/chats').orderByChild('meta/updatedAt').limitToLast(30).once('value');const data=s.val()||{};const list=document.getElementById('hlist');list.innerHTML='';Object.entries(data).filter(([,c])=>c.meta).sort(([,a],[,b])=>(b.meta.updatedAt||0)-(a.meta.updatedAt||0)).forEach(([id,c])=>{const d=document.createElement('div');d.className='hi'+(id===cid?' on':'');d.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="hit">'+(c.meta.title||'Chat')+'</span><button class="hid2" onclick="dChat(\''+id+'\',event)">x</button>';d.onclick=e=>{if(e.target.classList.contains('hid2'))return;ldChat(id);};list.appendChild(d);});}catch(e){console.error('ldHist:',e);}}
async function ldChat(id){if(!CU)return;cid=id;hist=[];const s=await db.ref('users/'+CU.uid+'/chats/'+id+'/messages').once('value');clrMsgs();hwlc();Object.values(s.val()||{}).forEach(m=>addMsg(m.role,m.content,true,null,null,false));ldHist();}
async function dChat(id,e){e.stopPropagation();if(!CU)return;await db.ref('users/'+CU.uid+'/chats/'+id).remove();if(id===cid)newChat();else ldHist();toast('Deleted','in');}
function newChat(){cid='c'+Date.now();hist=[];clrMsgs();swlc();ldHist();}

// ══════════════════════════════
// GROQ API — WITH 6-KEY ROTATION
// ══════════════════════════════
function selM(m){mdl=m;toast(m.split('/').pop(),'in');}
function sm(m){
  mode=m;
  handleMusicForMode(m);
  document.querySelectorAll('.ni').forEach(i=>i.classList.remove('on'));
  const el=document.querySelector('[data-m="'+m+'"]');if(el)el.classList.add('on');
  const bdg=document.getElementById('mbdg');
  bdg.textContent=MN[m]||m;
  bdg.className='mbdg'+(m==='trading'?' trd':'');
  if(m==='pro'){mdl='deepseek-r1-distill-llama-70b';document.getElementById('msel').value=mdl;}
  else if(m==='code'){mdl='llama-3.3-70b-versatile';document.getElementById('msel').value=mdl;}
  else if(m==='chat'){mdl='compound-beta-mini';document.getElementById('msel').value=mdl;}
  if(m==='dual'){opn('dual-m');return;}
  if(m==='quiz'){opn('quiz-m');return;}
  if(m==='translate'){opn('tr-m');return;}
  if(m==='trading'){opn('trd-m');return;}
  toast(MN[m],'in');newChat();
}

async function callG(userMsg,aFiles){
  if(isGen){stopG();return;}
  isGen=true;abrt=new AbortController();updSB(true);
  let full=userMsg;
  if(aFiles&&aFiles.length) full+=aFiles.map(f=>'\n\n[File: '+f.name+' ('+f.type+')]\n'+(f.content||'').substring(0,4000)).join('');
  hist.push({role:'user',content:full});
  const msgs=[{role:'system',content:SYS[mode]||SYS.chat},...hist.slice(-18)];
  const tid=showTyp();
  try{
    // Try all keys
    let resp=null;
    for(let attempt=0;attempt<API_KEYS.length;attempt++){
      const ki=_ki;
      try{
        const r=await fetch(GURL,{method:'POST',headers:{'Authorization':'Bearer '+gKey(),'Content-Type':'application/json'},
          body:JSON.stringify({model:mdl,messages:msgs,max_tokens:isDeepTopic(full)?8192:2048,temperature:mode==='pro'?.5:.72,stream:true}),
          signal:abrt.signal});
        if(r.ok){_kf[ki]=0;resp=r;break;}
        const errD=await r.json().catch(()=>({}));
        if(r.status===429||r.status===401||r.status===403){rotKey(ki);await new Promise(res=>setTimeout(res,300));continue;}
        throw new Error(errD.error?.message||'HTTP '+r.status);
      }catch(err){
        if(err.name==='AbortError')throw err;
        if(attempt<API_KEYS.length-1){rotKey(ki);await new Promise(res=>setTimeout(res,200));}
        else throw err;
      }
    }
    if(!resp)throw new Error('All API keys failed');
    rmEl(tid);
    const reply=await streamR(resp);
    hist.push({role:'assistant',content:reply});
    await svMsg('user',userMsg);
    await svMsg('assistant',reply);
    return reply;
  }catch(e){
    rmEl(tid);
    if(e.name==='AbortError')addMsg('assistant','*Stopped*',true);
    else{let m='❌ Error: '+e.message;if(/rate.?limit/i.test(e.message))m='⏳ Rate limit hit — switched key, please resend';if(/model.*not.*found|does not exist/i.test(e.message))m='⚠️ Model unavailable — try another model';addMsg('assistant',m,true);}
  }finally{isGen=false;abrt=null;updSB(false);}
}

async function streamR(res){
  const rdr=res.body.getReader(),dec=new TextDecoder();
  const mid='s'+Date.now();mkStream(mid);
  let full='',buf='';
  try{
    while(true){
      const{done,value}=await rdr.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()||'';
      for(const ln of lines){
        if(!ln.startsWith('data:'))continue;
        const d=ln.slice(5).trim();if(d==='[DONE]')break;
        try{const j=JSON.parse(d);const dt=j.choices?.[0]?.delta?.content||'';if(dt){full+=dt;updStream(mid,full);}}catch(e){}
      }
    }
  }catch(e){if(e.name!=='AbortError')console.error('stream:',e);}
  finStream(mid,full);return full;
}

// qCall — non-streaming with key rotation + optional history + network timeout
async function qCall(msg,model,sys,history){
  for(let attempt=0;attempt<API_KEYS.length;attempt++){
    const ki=_ki;
    try{
      const r=await fetch(GURL,{method:'POST',headers:{'Authorization':'Bearer '+gKey(),'Content-Type':'application/json'},
        body:JSON.stringify({model:model||'llama-3.3-70b-versatile',messages:[...(sys?[{role:'system',content:sys}]:[]),...(history||[]).slice(-8),{role:'user',content:msg}],max_tokens:model==='llama-3.1-8b-instant'?1024:4096,temperature:.72}),
        signal:AbortSignal.timeout(model==='llama-3.1-8b-instant'?8000:25000)});
      const d=await r.json();
      if(r.ok){_kf[ki]=0;return d.choices?.[0]?.message?.content||'';}
      if(r.status===429||r.status===401){rotKey(ki);await new Promise(res=>setTimeout(res,400));continue;}
      throw new Error(d.error?.message||'API Error');
    }catch(err){
      if(attempt===API_KEYS.length-1)return '❌ All keys failed: '+err.message;
      rotKey(ki);await new Promise(res=>setTimeout(res,300));
    }
  }
  return '❌ Request failed after all retries';
}

function stopG(){if(abrt)abrt.abort();isGen=false;updSB(false);toast('Stopped','in');}

// ── SEND ──
async function sendMsg(){
  const inp=document.getElementById('mi');const msg=inp.value.trim();
  if(!msg&&!ufiles.length)return;if(isGen){stopG();return;}
  inp.value='';inp.style.height='auto';hwlc();

  // AUTO IMAGE: if user asks to draw/make/generate image — use EXACT user words
  if(isImgReq(msg)&&!ufiles.length){
    addMsg('user',msg);
    // Extract just the image subject from message, no AI rewriting
    const imgSubject=msg.replace(/(please|banao|bana do|bnao|generate|create|make|draw|show me|image|picture|photo|de do|dedo|chahiye|chahye)/gi,'').trim()||msg;
    await genImg(imgSubject);
    clrFiles();return;
  }

  // YOUTUBE EMBED: if user wants a video
  if(needsYT(msg)){
    addMsg('user',msg);
    const q=ytQuery(msg);
    const ytHtml=mkYTEmbed(q,msg);
    addMsg('assistant','',true,ytHtml);
    // Also give AI explanation
    const exp=await qCall('Briefly explain: '+msg+' in 3-4 sentences.',mdl,SYS[mode]||SYS.chat);
    addMsg('assistant',exp,true);
    clrFiles();return;
  }

  if(mode==='img'&&!ufiles.length){
    addMsg('user',msg);
    // Use exact user prompt — no AI modification
    await genImg(msg);
    clrFiles();return;
  }
  if(mode==='web'||needsWeb(msg)){addMsg('user',msg);await doSearch(msg);clrFiles();return;}
  if(mode==='translate'&&!ufiles.length){addMsg('user',msg);await doTr(msg,'Arabic');clrFiles();return;}
  if(mode==='trading'){addMsg('user',msg);await trdChat(msg);clrFiles();return;}
  addMsg('user',msg,false,null,ufiles.length?[...ufiles]:null);
  await callG(msg,[...ufiles]);clrFiles();
}
function ss(t){document.getElementById('mi').value=t;sendMsg();}

// YouTube embed HTML builder
function mkYTEmbed(query,origMsg){
  const enc=encodeURIComponent(query);
  const ytSearch='https://www.youtube.com/results?search_query='+enc;
  return `<div style="border:1px solid rgba(255,0,0,.25);border-radius:14px;overflow:hidden;background:var(--bgc)">
    <div style="padding:10px 14px;border-bottom:1px solid var(--br);display:flex;align-items:center;gap:8px;background:rgba(255,0,0,.06)">
      <span style="color:#FF0000;font-size:1.1rem">▶</span>
      <span style="font-weight:700;font-size:.88rem;flex:1">YouTube: <em style="color:var(--ts)">${query.substring(0,55)}</em></span>
      <a href="${ytSearch}" target="_blank" style="font-size:.72rem;color:#FF0000;text-decoration:none;padding:3px 8px;border:1px solid rgba(255,0,0,.3);border-radius:6px">Open ↗</a>
    </div>
    <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;background:#000">
      <iframe
        src="https://www.youtube-nocookie.com/embed?listType=search&list=${enc}&autoplay=0&rel=0&modestbranding=1&hl=ur"
        style="position:absolute;top:0;left:0;width:100%;height:100%;border:none"
        allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
        allowfullscreen loading="lazy">
      </iframe>
    </div>
    <div style="padding:8px 14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <a href="${ytSearch}" target="_blank" class="dbtn" style="font-size:.78rem;padding:6px 12px;background:linear-gradient(135deg,#FF0000,#cc0000)">▶ Search on YouTube</a>
      <a href="https://www.youtube.com/results?search_query=${enc}&sp=EgIQAQ%3D%3D" target="_blank" class="dbtn" style="font-size:.78rem;padding:6px 12px;background:linear-gradient(135deg,#1a1a2e,#16213e)">🎓 Courses</a>
    </div>
  </div>`;
}
function onK(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}
function aS(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,200)+'px';}
function updSB(l){const b=document.getElementById('sbt');b.innerHTML=l?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';}
function needsWeb(m){return /latest|recent|today|news|current|2025|2026|trending|price of|who is|cricket|score|weather|stock/i.test(m);}

// ══════════════════════════════
// MSG UI
// ══════════════════════════════
function addMsg(role,content,render=true,customHTML=null,aFiles=null,scroll=true){
  const c=document.getElementById('msgs');
  const el=document.createElement('div');el.className='msg '+(role==='user'?'u':'a');
  const time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const av=role==='user'?'<div class="mav" style="background:linear-gradient(135deg,var(--p),var(--ps))">'+(CU?.displayName?.charAt(0)||'U')+'</div>':'<div class="mav"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI"/></div>';
  let bub=customHTML?customHTML:render&&window.marked?marked.parse(content||''):esc(content||'').replace(/\n/g,'<br>');
  let fa='';
  if(aFiles&&aFiles.length) fa=aFiles.map(f=>f.cat==='image'&&f.du?'<div class="fat">🖼️ '+f.name+'</div><img src="'+f.du+'" class="cimg" alt="'+f.name+'"/>':'<div class="fat">'+fic(f.cat)+' '+f.name+' <span style="color:var(--tm);margin-left:5px">'+fsz(f.size)+'</span></div>').join('');
  const acts=(role==='a'||role==='assistant')?`<div class="mac"><button class="ma" onclick="cpM(this)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button><button class="ma" onclick="spkM(this)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Read</button><button class="ma" onclick="rtM(this)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.35"/></svg> Retry</button></div>`:'';
  el.innerHTML=av+'<div class="mc2">'+fa+'<div class="mb">'+bub+'</div><span class="mt">'+time+'</span>'+acts+'</div>';
  if(render) setTimeout(()=>{el.querySelectorAll('pre code').forEach(b=>{const pre=b.parentElement;pre.classList.add('cbw');const lg=b.className.match(/language-(\w+)/);const la=lg?lg[1]:'code';const lb=document.createElement('span');lb.className='clang';lb.textContent=la;const cb=document.createElement('button');cb.className='ccpy';cb.textContent='Copy';cb.onclick=()=>{navigator.clipboard.writeText(b.innerText).then(()=>{cb.textContent='Copied!';setTimeout(()=>cb.textContent='Copy',2000);});};pre.appendChild(lb);pre.appendChild(cb);if(window.hljs)hljs.highlightElement(b);});},30);
  c.appendChild(el);if(scroll)scr();return el;
}
function mkStream(id){const c=document.getElementById('msgs');const el=document.createElement('div');el.className='msg a';el.id=id;el.innerHTML='<div class="mav"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI"/></div><div class="mc2"><div class="mb" id="'+id+'_c"><span style="animation:blink .8s step-end infinite;color:var(--p)">▋</span></div></div>';c.appendChild(el);scr();}
function updStream(id,content){const el=document.getElementById(id+'_c');if(!el)return;el.innerHTML=(window.marked?marked.parse(content):esc(content).replace(/\n/g,'<br>'))+'<span style="animation:blink .8s step-end infinite;color:var(--p)">▋</span>';scr();}
function finStream(id,content){
  const el=document.getElementById(id+'_c');if(el)el.innerHTML=window.marked?marked.parse(content):esc(content).replace(/\n/g,'<br>');
  const msgEl=document.getElementById(id);
  if(msgEl){
    msgEl.className='msg assistant';
    msgEl.querySelectorAll('pre code').forEach(b=>{const pre=b.parentElement;pre.classList.add('cbw');const lg=b.className.match(/language-(\w+)/);const la=lg?lg[1]:'code';const lb=document.createElement('span');lb.className='clang';lb.textContent=la;const cb=document.createElement('button');cb.className='ccpy';cb.textContent='Copy';cb.onclick=()=>{navigator.clipboard.writeText(b.innerText).then(()=>{cb.textContent='Copied!';setTimeout(()=>cb.textContent='Copy',2000);});};pre.appendChild(lb);pre.appendChild(cb);if(window.hljs)hljs.highlightElement(b);});
    const time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    msgEl.querySelector('.mc2').insertAdjacentHTML('beforeend','<span class="mt">'+time+'</span><div class="mac"><button class="ma" onclick="cpM(this)">Copy</button><button class="ma" onclick="spkM(this)">Read</button><button class="ma" onclick="rtM(this)">Retry</button></div>');
  }
  scr();
}
function showTyp(){const id='ty'+Date.now();const c=document.getElementById('msgs');const el=document.createElement('div');el.className='msg a';el.id=id;el.innerHTML='<div class="mav"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI"/></div><div class="mc2"><div class="typ"><div class="td"></div><div class="td"></div><div class="td"></div></div></div>';c.appendChild(el);scr();return id;}
function showThi(txt){const id='th'+Date.now();const c=document.getElementById('msgs');const el=document.createElement('div');el.className='msg a';el.id=id;el.innerHTML='<div class="mav"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI"/></div><div class="mc2"><div class="thi"><div class="tsp"></div><span>'+txt+'</span></div></div>';c.appendChild(el);scr();return id;}
function showPrg(txt){const id='pr'+Date.now();const c=document.getElementById('msgs');const el=document.createElement('div');el.className='msg a';el.id=id;el.innerHTML='<div class="mav"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI"/></div><div class="mc2"><div class="prg"><div class="prg-l" id="'+id+'_l">'+txt+'</div><div class="prg-b"><div class="prg-f" id="'+id+'_f" style="width:0%"></div></div></div></div>';c.appendChild(el);scr();return id;}
function updPrg(id,txt,pct){const l=document.getElementById(id+'_l'),f=document.getElementById(id+'_f');if(l)l.textContent=txt;if(f)f.style.width=pct+'%';scr();}
function rmEl(id){const e=document.getElementById(id);if(e)e.remove();}
function cpM(btn){navigator.clipboard.writeText(btn.closest('.mc2').querySelector('.mb')?.innerText||'').then(()=>toast('Copied!','ok'));}
function spkM(btn){spk(btn.closest('.mc2').querySelector('.mb')?.innerText||'');}
async function rtM(btn){const ums=document.querySelectorAll('.msg.u,.msg.user');if(!ums.length)return;const txt=ums[ums.length-1].querySelector('.mb')?.innerText||'';const ams=document.querySelectorAll('.msg.a,.msg.assistant');if(ams.length)ams[ams.length-1].remove();if(hist.length)hist.pop();await callG(txt,[]);}

// ══════════════════════════════
// FILE HANDLING
// ══════════════════════════════
async function onF(e){const fs=Array.from(e.target.files);e.target.value='';for(const f of fs){try{const p=await procF(f);ufiles.push(p);addFP(p);}catch(e2){toast('Failed: '+f.name,'er');}}if(ufiles.length){document.getElementById('fpb').classList.remove('h');toast(ufiles.length+' file(s) ready','ok');}}
async function procF(f){const ext=f.name.split('.').pop().toLowerCase();const r={name:f.name,type:f.type||'',size:f.size,ext,content:'',cat:'',du:null};if(['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)){r.du=await rdDU(f);r.content='[Image: '+f.name+']';r.cat='image';}else if(['js','ts','py','html','css','php','java','cpp','c','cs','go','rs','rb','swift','kt','dart','sql','sh','bash','jsx','tsx','vue','r','scala','lua','m3u','m3u8','txt','md','log','yaml','yml','toml','ini','json','csv','tsv','jsonl','xml'].includes(ext)){r.content=await rdTxt(f);r.cat=ext==='json'?'json':ext==='csv'||ext==='tsv'?'csv':['js','ts','py','php','java','cpp','c','cs','go','rs','rb','swift','kt','dart','sql','sh','bash','jsx','tsx','vue','r','scala','lua'].includes(ext)?'code':'text';}else if(ext==='zip'){r.content=await rdZip(f);r.cat='zip';}else if(ext==='pdf'){r.content='[PDF: '+f.name+' — '+fsz(f.size)+'. Analyze this PDF document content and structure.]';r.cat='pdf';}else{try{r.content=await rdTxt(f);r.cat='text';}catch(e){r.content='[Binary: '+f.name+']';r.cat='binary';}}return r;}
async function rdZip(f){if(!window.JSZip)return '[ZIP: '+f.name+']';const z=await JSZip.loadAsync(f);let out='ZIP: '+f.name+'\nFiles:\n';const fl=[];z.forEach((p,e)=>fl.push({p,e}));fl.forEach(({p,e})=>{out+=(e.dir?'[DIR] ':'[FILE] ')+p+'\n';});const tx=['js','ts','py','html','css','txt','md','json','yaml','yml','sh','php','java','cpp','c','go','rs','sql'];let rc=0;for(const{p,e}of fl){if(e.dir||rc>=8)continue;const ext=p.split('.').pop().toLowerCase();if(!tx.includes(ext))continue;try{const t=await e.async('string');out+='\n--- '+p+' ---\n'+t.substring(0,2500)+'\n';rc++;}catch(e2){}}return out;}
const rdTxt=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsText(f,'UTF-8');});
const rdDU=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(f);});
function addFP(f){const c=document.getElementById('fps');const d=document.createElement('div');d.className='fp';d.id='fp_'+f.name.replace(/\W/g,'_');d.innerHTML=fic(f.cat)+' <span>'+f.name.substring(0,18)+'</span> <button onclick="rmFP(\''+f.name+'\')">x</button>';c.appendChild(d);}
function rmFP(n){ufiles=ufiles.filter(f=>f.name!==n);const e=document.getElementById('fp_'+n.replace(/\W/g,'_'));if(e)e.remove();if(!ufiles.length)document.getElementById('fpb').classList.add('h');}
function clrFiles(){ufiles=[];document.getElementById('fps').innerHTML='';document.getElementById('fpb').classList.add('h');}
function fic(c){return{image:'🖼️',pdf:'📄',zip:'📦',code:'💻',text:'📝',json:'🔧',csv:'📊',m3u:'📺',binary:'💾',audio:'🎵',video:'🎬'}[c]||'📁';}
function fsz(b){if(b<1024)return b+'B';if(b<1048576)return (b/1024).toFixed(1)+'KB';return (b/1048576).toFixed(1)+'MB';}

// ══════════════════════════════
// PDF GENERATOR — FIXED
// ══════════════════════════════
async function rPDF(){
  const topic=(document.getElementById('pt').value||'').trim();
  const pages=parseInt(document.getElementById('pp').value)||60;
  const btype=document.getElementById('ptp').value||'educational';
  const details=(document.getElementById('pd').value||'').trim();
  const cover=document.getElementById('pcv').checked;
  const toc=document.getElementById('ptoc').checked;
  if(!topic){toast('Enter a topic','er');return;}
  cls();hwlc();
  const pid=showPrg('📚 Generating "'+topic.substring(0,40)+'"...');
  try{
    updPrg(pid,'Generating outline...',6);
    const outline=await qCall('Create detailed book outline for: "'+topic+'". Include title, 10-14 chapters with sub-sections.'+(details?' Additional: '+details:''),mdl,SYS.pdf);
    const chaps=Math.min(Math.max(5,Math.floor(pages/10)),12);
    const content=[];
    for(let i=1;i<=chaps;i++){
      updPrg(pid,'Writing Chapter '+i+'/'+chaps+'...',6+(i/chaps)*70);
      try{
        const c=await qCall('Write Chapter '+i+' for a '+btype+' book about "'+topic+'". Outline reference: '+(outline||'').substring(0,300)+(details?'\nExtra context: '+details:'')+'\nWrite 1000+ words, detailed informative content.'+(btype==='islamic'?'\nInclude Quranic verses and hadith. Begin with بِسْمِ اللَّهِ':'')+(btype==='trading'?'\nInclude practical trading examples, charts descriptions, strategies.':''),mdl,SYS.pdf);
        content.push({i,text:c||'Chapter '+i+' content.'});
      }catch(ce){content.push({i,text:'Chapter '+i+': '+topic+'\n\nContent for this chapter about '+topic+'.'});}
    }
    updPrg(pid,'Building PDF...',82);
    await bldPDF({topic,btype,outline:outline||'',content,cover,toc,pages});
    rmEl(pid);
    addMsg('assistant','✅ **PDF Book Generated!**\n\n**Title:** '+topic+'\n**Chapters:** '+chaps+'\n**Pages:** '+pages+'\n**Type:** '+btype+'\n\nDownloaded to your device!',true);
    toast('PDF ready!','ok');
  }catch(e){rmEl(pid);console.error('PDF error:',e);addMsg('assistant','❌ PDF Error: '+e.message+'\n\nPlease try again with a shorter topic.',true);}
}

async function bldPDF({topic,btype,outline,content,cover,toc,pages}){
  if(!window.jspdf)throw new Error('jsPDF not loaded, please reload');
  const{jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=20,CW=W-M*2;
  let pg=1;

  // Safe string helper — prevents substring errors
  const safe=(s,max=9999)=>(s||'').toString().substring(0,max);
  const safeText=(doc,text,x,y,opts)=>{try{doc.text(safe(text),x,y,opts||{});}catch(e){}};

  function bg(c){doc.setFillColor(...(c||[8,8,15]));doc.rect(0,0,W,H,'F');}
  function hdr(l){doc.setFillColor(15,15,26);doc.rect(0,0,W,13,'F');doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(124,111,255);safeText(doc,'MI AI',M,9);doc.setTextColor(80,80,120);safeText(doc,safe(topic,42),W/2,9,{align:'center'});safeText(doc,safe(l),W-M,9,{align:'right'});}
  function ftr(p){doc.setFillColor(15,15,26);doc.rect(0,H-11,W,11,'F');doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(60,60,100);safeText(doc,'MI AI · Muaaz Iqbal · Muslim Islam Org',M,H-5);doc.setTextColor(124,111,255);safeText(doc,String(p),W-M,H-5,{align:'right'});}

  if(cover){
    bg();
    doc.setFillColor(124,111,255);doc.rect(0,0,W,5,'F');
    doc.setFillColor(0,212,170);doc.rect(0,H-5,W,5,'F');
    doc.setFillColor(124,111,255);doc.rect(0,0,4,H,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(124,111,255);safeText(doc,'MI AI',W/2,26,{align:'center'});
    const tc={educational:[0,212,170],islamic:[255,215,0],technical:[124,111,255],novel:[255,107,107],research:[100,180,255],selfhelp:[255,165,0],trading:[240,180,41]}[btype]||[200,200,200];
    doc.setFillColor(...tc);doc.roundedRect(W/2-26,33,52,9,2,2,'F');
    doc.setFontSize(7.5);doc.setTextColor(8,8,15);safeText(doc,btype.toUpperCase(),W/2,39,{align:'center'});
    doc.setFont('helvetica','bold');doc.setFontSize(24);doc.setTextColor(240,240,255);
    const tl=doc.splitTextToSize(safe(topic).toUpperCase(),CW-8);
    let ty=H/2-20;tl.forEach(l=>{safeText(doc,l,W/2,ty,{align:'center'});ty+=12;});
    if(btype==='islamic'){doc.setFont('helvetica','normal');doc.setFontSize(13);doc.setTextColor(255,215,0);safeText(doc,'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',W/2,ty+10,{align:'center'});}
    doc.setFontSize(8);doc.setTextColor(70,70,110);safeText(doc,content.length+' Chapters · '+pages+' Pages · '+new Date().getFullYear(),W/2,H-25,{align:'center'});
    doc.setFillColor(22,22,40);doc.rect(M,H-20,CW,13,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(124,111,255);safeText(doc,'MI AI',M+7,H-12);
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(120,120,160);safeText(doc,'Muaaz Iqbal · Muslim Islam Org · Powered by Groq',M+7,H-7);
    doc.addPage();pg++;
  }

  if(toc){
    bg();hdr('Contents');
    doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(240,240,255);safeText(doc,'Table of Contents',W/2,30,{align:'center'});
    doc.setDrawColor(124,111,255);doc.setLineWidth(.3);doc.line(M,35,W-M,35);
    let y=48;
    content.forEach((ch,i)=>{
      if(y>H-22){ftr(pg);doc.addPage();pg++;bg();hdr('Contents');y=30;}
      const chText=safe(ch.text||'');
      const ttl=chText.split('\n').slice(0,4).map(l=>l.replace(/^#+\s*/,'').replace(/\*\*/g,'').trim()).find(l=>l.length>5&&l.length<80)||'Chapter '+(i+1);
      doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(124,111,255);safeText(doc,'Ch.'+(i+1),M,y);
      doc.setFont('helvetica','normal');doc.setTextColor(200,200,220);doc.setFontSize(10);
      const tls=doc.splitTextToSize(safe(ttl),CW-45);safeText(doc,tls[0]||'',M+26,y);
      doc.setTextColor(80,80,120);safeText(doc,String(pg+i+1),W-M,y,{align:'right'});
      y+=11;
    });
    ftr(pg);doc.addPage();pg++;
  }

  content.forEach((ch,ci)=>{
    bg();
    doc.setFillColor(124,111,255);doc.rect(0,0,4,H,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(38);doc.setTextColor(20,20,38);safeText(doc,String(ci+1).padStart(2,'0'),W-M,H/2,{align:'right'});
    doc.setFontSize(8.5);doc.setTextColor(124,111,255);safeText(doc,'CHAPTER '+(ci+1),M+10,H/2-18);
    const chText=safe(ch.text||'');
    const ttl=chText.split('\n').slice(0,4).map(l=>l.replace(/^#+\s*/,'').replace(/\*\*/g,'').trim()).find(l=>l.length>5&&l.length<80)||'Chapter '+(ci+1);
    doc.setFontSize(18);doc.setTextColor(240,240,255);const ctl=doc.splitTextToSize(safe(ttl),CW-24);ctl.forEach((l,li)=>safeText(doc,l,M+10,H/2+(li*10)));
    doc.setFillColor(0,212,170);doc.rect(0,H-4,W,4,'F');
    ftr(pg);doc.addPage();pg++;

    bg();hdr('Ch.'+(ci+1));
    const clean=(ch.text||'').replace(/```[\s\S]*?```/g,'[Code Block]').replace(/`([^`]+)`/g,'$1').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/!\[[^\]]*\]\([^)]+\)/g,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').replace(/^#{1,6}\s/gm,'').replace(/^[-*+]\s/gm,'· ').replace(/\n{3,}/g,'\n\n').trim();
    const lines=doc.splitTextToSize(clean,CW);
    let y=27;
    lines.forEach(line=>{
      if(y>H-16){ftr(pg);doc.addPage();pg++;bg();hdr('Ch.'+(ci+1));y=27;}
      if((line||'').match(/^[A-Z][A-Z\s]{8,}$|^(CHAPTER|SECTION|PART|INTRODUCTION|CONCLUSION)\s/i)){
        if(y>28)y+=4;
        doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(124,111,255);safeText(doc,line,M,y);y+=7;
        doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(215,215,235);
      }else if(!(line||'').trim()){y+=3;}
      else{doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(215,215,235);safeText(doc,line,M,y);y+=6.2;}
    });
    ftr(pg);if(ci<content.length-1){doc.addPage();pg++;}
  });

  doc.addPage();bg();
  doc.setFillColor(124,111,255);doc.rect(0,0,W,5,'F');
  doc.setFillColor(0,212,170);doc.rect(0,H-5,W,5,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(24);doc.setTextColor(22,22,40);safeText(doc,'MI AI',W/2,H/2-10,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(60,60,100);safeText(doc,'Muaaz Iqbal · Muslim Islam Org · Groq Powered',W/2,H/2,{align:'center'});

  const safeTitle=safe(topic).replace(/\s+/g,'_').replace(/[^\w_]/g,'').substring(0,28)||'Book';
  doc.save('MI-AI_'+safeTitle+'_'+Date.now()+'.pdf');
}

// ══════════════════════════════
// IMAGE GENERATOR
// ══════════════════════════════
function setSz(btn,sz){document.querySelectorAll('.szb').forEach(b=>b.classList.remove('on'));btn.classList.add('on');iSz=sz;}
async function rImg(){
  const prompt=(document.getElementById('ip').value||'').trim();
  const style=document.getElementById('is').value;
  const four=document.getElementById('i4v').checked;
  if(!prompt){toast('Describe the image','er');return;}
  cls();hwlc();
  // Use EXACT user prompt + style — no AI modification
  const finalPrompt=style?prompt+', '+style:prompt;
  if(four)await gen4Imgs(finalPrompt);
  else await genImg(finalPrompt);
}
async function genImg(prompt){
  const tid=showThi('🎨 Generating image...');
  const[W,H]=(iSz||'512x512').split('x').map(Number);
  const seed=Math.floor(Math.random()*999999);
  // Use EXACT prompt, no encoding tricks that change meaning
  const cleanPrompt=(prompt||'').substring(0,600);
  const enc=encodeURIComponent(cleanPrompt);
  // Pollinations — model=flux for best quality
  const url=`https://image.pollinations.ai/prompt/${enc}?width=${W}&height=${H}&seed=${seed}&nologo=true&model=flux`;
  const url2=`https://image.pollinations.ai/prompt/${enc}?width=${W}&height=${H}&seed=${seed+1}&nologo=true`;
  rmEl(tid);
  const shortPrompt=cleanPrompt.length>90?cleanPrompt.substring(0,87)+'...':cleanPrompt;
  // Safe escaped prompt for onclick
  const safeP=enc.substring(0,80);
  const html=`<div class="ir">
    <div style="position:relative;background:var(--bgi);min-height:180px;display:flex;align-items:center;justify-content:center">
      <div id="img-load-${seed}" style="position:absolute;color:var(--ts);font-size:.8rem;display:flex;flex-direction:column;align-items:center;gap:8px">
        <div class="tsp" style="width:24px;height:24px;border-width:3px"></div>
        <span>Generating...</span>
      </div>
      <img class="ir-img" src="${url}"
        alt="Generated"
        loading="lazy"
        style="width:100%;display:block;min-height:180px;object-fit:contain"
        onload="document.getElementById('img-load-${seed}')?.remove()"
        onerror="this.src='${url2}';document.getElementById('img-load-${seed}')?.remove()"/>
    </div>
    <div class="ir-info">
      <p style="font-size:.82rem;color:var(--tp);margin-bottom:3px;font-weight:600">🖼️ Your Image</p>
      <p style="font-size:.76rem;color:var(--ts);margin-bottom:6px;line-height:1.5">${shortPrompt}</p>
      <p style="font-size:.7rem;color:var(--tm)">Size: ${W}×${H} · Seed: ${seed} · Model: flux</p>
      <div class="ir-acts" style="margin-top:10px">
        <a class="dl g" href="${url}" download="MI-AI-${seed}.png" target="_blank">⬇ Download</a>
        <button class="dl p" onclick="genImg(decodeURIComponent('${safeP}'))">🔄 Retry</button>
        <button class="dl r" onclick="gen4Imgs(decodeURIComponent('${safeP}'))">✦ 4 Variations</button>
      </div>
    </div>
  </div>`;
  addMsg('assistant','',true,html);
  toast('Image generated!','ok');
}
async function gen4Imgs(prompt){const tid=showThi('🎨 Generating 4 variations...');const[W,H]=iSz.split('x').map(Number);const w2=Math.floor(W/2),h2=Math.floor(H/2);const enc=encodeURIComponent((prompt||'').substring(0,400));const imgs=Array.from({length:4},()=>'https://image.pollinations.ai/prompt/'+enc+'?width='+w2+'&height='+h2+'&seed='+Math.floor(Math.random()*999999)+'&nologo=true');rmEl(tid);const html='<div><p style="font-weight:700;margin-bottom:10px">🎨 4 Variations</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+imgs.map((u,i)=>`<div><img src="${u}" style="width:100%;border-radius:9px;display:block;background:var(--bgi);min-height:100px" loading="lazy" onerror="this.style.display='none'"/><a href="${u}" download="MI-AI-v${i+1}-${Date.now()}.png" style="display:block;text-align:center;font-size:.74rem;color:var(--sl);margin-top:4px">Download V${i+1}</a></div>`).join('')+'</div></div>';addMsg('assistant','',true,html);}

// ══════════════════════════════
// ZIP GENERATOR
// ══════════════════════════════
async function rZip(){
  const desc=document.getElementById('zd').value.trim(),type=document.getElementById('zt').value;
  if(!desc){toast('Describe the project','er');return;}
  cls();hwlc();const pid=showPrg('📦 Generating project...');
  try{
    updPrg(pid,'AI writing code...',12);
    const typeH={web:'index.html (2500+ lines), styles.css (1200+ lines), app.js (1000+ lines), README.md',react:'src/App.jsx (2000+ lines), src/components/*.jsx, src/styles/App.css (800+ lines), package.json',python:'main.py (2500+ lines), utils.py (1000+ lines), models.py (800+ lines), requirements.txt, README.md',nodejs:'src/server.js (2000+ lines), src/routes/api.js, package.json, .env.example, README.md',fullstack:'frontend/index.html, frontend/js/app.js (2000+ lines), backend/server.js (2000+ lines), package.json, README.md',django:'manage.py, myapp/views.py (1500+ lines), myapp/models.py, requirements.txt, README.md',flutter:'lib/main.dart (2000+ lines), lib/screens/*.dart, pubspec.yaml, README.md',custom:'All required files with complete working code'};
    const resp=await qCall('Create complete '+type+' project: "'+desc+'"\nRequired files: '+(typeH[type]||typeH.custom)+'\n\nRULES:\n- COMPLETE code NO shortcuts NO "..."\n- Minimum 3000 total lines\n- Full error handling + comments\n- Production-ready\n\nReturn ONLY valid JSON:\n{"projectName":"name","files":[{"path":"file.ext","content":"FULL content"}]}','llama-3.3-70b-versatile',SYS.code);
    updPrg(pid,'Creating ZIP...',75);
    let proj;try{const m=resp.match(/\{[\s\S]*\}/);if(m)proj=JSON.parse(m[0]);}catch(e){}
    if(!proj?.files?.length)proj={projectName:'mi-ai-project',files:[{path:'main.js',content:resp}]};
    const zip=new JSZip();const folder=zip.folder(proj.projectName||'mi-ai-project');
    proj.files.forEach(f=>{const parts=f.path.split('/');if(parts.length>1){let cur=folder;for(let i=0;i<parts.length-1;i++)cur=cur.folder(parts[i]);cur.file(parts[parts.length-1],f.content||'');}else folder.file(f.path,f.content||'');});
    folder.file('MI-AI-INFO.md','# MI AI Generated Project\nBy: Muaaz Iqbal | Muslim Islam Org\nDate: '+new Date().toLocaleString()+'\nProject: '+desc+'\n\nبِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    updPrg(pid,'Compressing...',92);
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:9}});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(proj.projectName||'mi-ai-project')+'.zip';a.click();
    rmEl(pid);addMsg('assistant','✅ **ZIP Downloaded!**\n\n**Project:** '+proj.projectName+'\n**Files:** '+proj.files.length+'\n\nExtract and start coding!',true);toast('ZIP ready!','ok');
  }catch(e){rmEl(pid);addMsg('assistant','ZIP Error: '+e.message,true);}
}

// ══════════════════════════════
// DOCUMENT GENERATOR
// ══════════════════════════════
async function rDoc(){
  const topic=(document.getElementById('dt').value||'').trim(),dtype=document.getElementById('dtp').value,details=(document.getElementById('dd').value||'').trim();
  if(!topic){toast('Enter a topic','er');return;}
  cls();hwlc();const tid=showThi('📄 Generating document...');
  try{
    const content=await qCall('Write a comprehensive professional '+dtype+' about: "'+topic+'"\n'+details+'\nMinimum 2000 words. Include proper structure, headings, detailed paragraphs.',mdl,SYS.pdf);
    rmEl(tid);
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${topic}</title><style>body{font-family:Calibri,sans-serif;margin:3cm;color:#222;line-height:1.6}h1{color:#1a3a5c;border-bottom:2px solid #1a3a5c;font-size:22pt;margin-bottom:12pt}h2{color:#234e6e;font-size:14pt;margin-top:18pt}h3{color:#2d6892;font-size:12pt}p{font-size:11pt;text-align:justify;margin-bottom:8pt}li{font-size:11pt;margin-bottom:4pt}.foot{text-align:center;color:#888;font-size:8pt;margin-top:40pt;border-top:1px solid #ccc;padding-top:8pt}</style></head><body><h1>${topic}</h1>${md2html(content)}<div class="foot">Generated by MI AI · Muaaz Iqbal · Muslim Islam Org · ${new Date().toLocaleDateString()}</div></body></html>`;
    const blob=new Blob([html],{type:'application/msword'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MI-AI-'+topic.replace(/\s+/g,'_').substring(0,25)+'-'+Date.now()+'.doc';a.click();
    addMsg('assistant','✅ **Document Downloaded!**\n\n**Topic:** '+topic+'\n**Type:** '+dtype+'\n\nOpens in Word / LibreOffice!',true);toast('Document ready!','ok');
  }catch(e){rmEl(tid);addMsg('assistant','Doc Error: '+e.message,true);}
}

// ══════════════════════════════
// SPREADSHEET
// ══════════════════════════════
async function rSheet(){
  const topic=(document.getElementById('sht').value||'').trim(),details=(document.getElementById('shd').value||'').trim();
  if(!topic){toast('Enter a topic','er');return;}
  cls();hwlc();const tid=showThi('📊 Generating spreadsheet...');
  const csv=await qCall('Create comprehensive CSV spreadsheet for: "'+topic+'"\n'+details+'\nHeaders in first row. At least 30 rows of realistic data. Return ONLY CSV, no other text.',mdl);
  rmEl(tid);
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MI-AI-'+topic.replace(/\s+/g,'_').substring(0,20)+'-'+Date.now()+'.csv';a.click();
  addMsg('assistant','✅ **Spreadsheet Downloaded!**\n\nPreview:\n```\n'+csv.split('\n').slice(0,6).join('\n')+'\n...\n```',true);toast('CSV ready!','ok');
}

// ══════════════════════════════
// WEB SEARCH
// ══════════════════════════════
function doWS(){const q=document.getElementById('mi').value.trim();if(q){addMsg('user',q);doSearch(q);document.getElementById('mi').value='';}else toast('Enter search query','er');}
async function doSearch(q){
  hwlc();const tid=showThi('🔍 Searching: "'+q.substring(0,50)+'"...');
  const links='<div style="display:flex;gap:7px;flex-wrap:wrap;margin:10px 0"><a href="https://www.google.com/search?q='+encodeURIComponent(q)+'" target="_blank" class="dbtn" style="background:linear-gradient(135deg,#4285F4,#34A853);font-size:.78rem;padding:6px 12px">🔍 Google</a><a href="https://search.brave.com/search?q='+encodeURIComponent(q)+'" target="_blank" class="dbtn" style="font-size:.78rem;padding:6px 12px">🦁 Brave</a><a href="https://duckduckgo.com/?q='+encodeURIComponent(q)+'" target="_blank" class="dbtn" style="background:linear-gradient(135deg,#DE5833,#C44B24);font-size:.78rem;padding:6px 12px">🦆 DuckDuckGo</a></div>';
  const resp=await qCall('Research: "'+q+'" — Comprehensive answer with key facts, context, perspectives, latest info, recommendations. Use markdown.',mdl,SYS.web);
  rmEl(tid);
  addMsg('assistant','',true,'<p>🔍 <strong>Search: "'+q.substring(0,60)+'"</strong></p>'+links);
  addMsg('assistant',resp,true);
}

// ══════════════════════════════
// DUAL AI
// ══════════════════════════════
async function rDual(){
  const topic=(document.getElementById('dum').value||'').trim(),m1=document.getElementById('dm1').value,m2=document.getElementById('dm2').value,rounds=parseInt(document.getElementById('drd').value)||3;
  if(!topic){toast('Enter topic','er');return;}
  cls();hwlc();
  addMsg('assistant','🤖🤖 **Dual AI Debate**\n\n**Topic:** '+topic+'\n**AI Alpha:** '+m1.split('/').pop()+'\n**AI Beta:** '+m2.split('/').pop()+'\n**Rounds:** '+rounds,true);
  let h1=[],h2=[];
  for(let r=1;r<=rounds;r++){
    const at=showThi('🤖 AI Alpha — Round '+r+'...');
    const ap=r===1?'Debate: "'+topic+'". Present strong opening argument with evidence.':'Counter "'+topic+'". AI Beta said: "'+(h2[h2.length-1]||'').substring(0,300)+'". Respond strongly.';
    const ar=await qCall(ap,m1,'You are a brilliant debater. Comprehensive, evidence-based arguments.');
    h1.push(ar);rmEl(at);
    addMsg('assistant','',true,'<div class="dw"><div class="dp"><div class="dph da">🤖 AI Alpha — Round '+r+' <small style="margin-left:auto;font-weight:400;font-size:.7rem">'+m1.split('/').pop()+'</small></div><div class="dpb">'+marked.parse(ar)+'</div></div></div>');
    const bt=showThi('🤖 AI Beta — Round '+r+'...');
    const bp='Debate "'+topic+'". Alpha: "'+ar.substring(0,400)+'...". Counter-argue, different perspective.';
    const br=await qCall(bp,m2,'You are a brilliant debater. Challenge arguments, offer unique perspectives.');
    h2.push(br);rmEl(bt);
    addMsg('assistant','',true,'<div class="dw"><div class="dp" style="border-color:var(--s)"><div class="dph db">🤖 AI Beta — Round '+r+' <small style="margin-left:auto;font-weight:400;font-size:.7rem">'+m2.split('/').pop()+'</small></div><div class="dpb">'+marked.parse(br)+'</div></div></div>');
  }
  const st=showThi('⚖️ Generating synthesis...');
  const syn=await qCall('Fair balanced synthesis of debate about "'+topic+'". Summarize key points, find common ground, conclude.','llama-3.3-70b-versatile');
  rmEl(st);addMsg('assistant','## ⚖️ Debate Synthesis\n\n'+syn,true);
}

// ══════════════════════════════
// QUIZ
// ══════════════════════════════
async function rQuiz(){
  const topic=(document.getElementById('qt').value||'').trim(),num=document.getElementById('qq').value||20,level=document.getElementById('ql').value;
  if(!topic){toast('Enter topic','er');return;}
  cls();hwlc();const tid=showThi('📝 Generating quiz...');
  const resp=await qCall('Create '+level+' difficulty quiz about "'+topic+'" with '+num+' questions. Mix MCQ (A/B/C/D), True/False, and short answer. Number each. Include ANSWER KEY at end.',mdl,SYS.quiz);
  rmEl(tid);addMsg('assistant',resp,true);
  const blob=new Blob([resp],{type:'text/plain'});
  const html='<button class="dbtn pu" onclick="this.closest(\'div\').querySelector(\'a\').click()">⬇ Download Quiz</button><a style="display:none"></a>';
  const el=addMsg('assistant','',true,html);el.querySelector('a').href=URL.createObjectURL(blob);el.querySelector('a').download='MI-AI-Quiz-'+topic.replace(/\s+/g,'_')+'-'+Date.now()+'.txt';
  toast('Quiz ready!','ok');
}

// ══════════════════════════════
// TRANSLATOR
// ══════════════════════════════
async function rTr(){const text=(document.getElementById('trt').value||'').trim(),lang=document.getElementById('trl').value;if(!text){toast('Enter text','er');return;}cls();hwlc();addMsg('user','Translate to '+lang+':\n\n'+text);const tid=showThi('🌐 Translating to '+lang+'...');const resp=await qCall('Translate to '+lang+'. Return ONLY the translation:\n\n'+text,'llama-3.1-8b-instant',SYS.translate);rmEl(tid);addMsg('assistant','**Translation ('+lang+'):**\n\n'+resp,true);toast('Translated!','ok');}
async function doTr(text,lang){const tid=showThi('🌐 Translating...');const resp=await qCall('Translate to '+lang+'. Return ONLY the translation:\n\n'+text,'llama-3.1-8b-instant');rmEl(tid);addMsg('assistant','**Translation ('+lang+'):**\n\n'+resp,true);}

// ══════════════════════════════
// CODE REVIEW
// ══════════════════════════════
async function rCR(){const code=(document.getElementById('crc').value||'').trim(),lang=document.getElementById('crl').value;if(!code){toast('Paste your code','er');return;}cls();hwlc();addMsg('user','Review this '+lang+' code:\n```'+lang+'\n'+code.substring(0,200)+'...\n```');const tid=showThi('🔍 Reviewing code...');const resp=await qCall('Review this '+lang+' code:\n1. Find ALL bugs, issues, security problems\n2. Provide COMPLETE fixed version (all lines)\n3. Explain each fix\n4. Suggest optimizations\n\n```'+lang+'\n'+code+'\n```',mdl,SYS.code);rmEl(tid);addMsg('assistant',resp,true);toast('Code reviewed!','ok');}

// ══════════════════════════════
// HTML PREVIEW
// ══════════════════════════════
function runPreview(){
  const code=(document.getElementById('prev-code').value||'').trim();
  if(!code){toast('Paste HTML code first','er');return;}
  const frame=document.getElementById('prev-frame');
  frame.style.display='block';
  const doc=frame.contentDocument||frame.contentWindow.document;
  doc.open();doc.write(code);doc.close();
  toast('Preview loaded!','ok');
}
function downloadPreview(){
  const code=document.getElementById('prev-code').value||'';
  if(!code){toast('No HTML to download','er');return;}
  const blob=new Blob([code],{type:'text/html'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MI-AI-preview-'+Date.now()+'.html';a.click();
  toast('Downloaded!','ok');
}

// ══════════════════════════════
// TRADING HUB
// ══════════════════════════════
function trdTab(id,btn){
  document.querySelectorAll('.trd-tab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.trd-content').forEach(c=>c.classList.remove('show'));
  btn.classList.add('on');
  document.getElementById('trd-'+id).classList.add('show');
}

function askTrading(question){cls();mode='trading';sm('chat');document.getElementById('mi').value=question;sendMsg();}

async function trdChat(msg){
  const tid=showTyp();
  const resp=await qCall(msg,mdl,SYS.trading);
  rmEl(tid);
  addMsg('assistant',resp,true);
  await svMsg('user',msg);await svMsg('assistant',resp);
}

async function genTrdQuiz(topic,num,level){
  const area=document.getElementById('trd-quiz-area');
  area.innerHTML='<div class="thi"><div class="tsp"></div><span>Generating '+topic+' quiz...</span></div>';
  try{
    const resp=await qCall('Create a '+level+' difficulty trading quiz about "'+topic+'" with exactly '+num+' questions.\n\nFormat STRICTLY as JSON array:\n[{"q":"question text","options":["A) option","B) option","C) option","D) option"],"answer":"A","explanation":"why this is correct"}]\n\nOnly return the JSON array, nothing else.','llama-3.3-70b-versatile',SYS.trading);
    let qs=[];
    try{const m=resp.match(/\[[\s\S]*\]/);if(m)qs=JSON.parse(m[0]);}catch(e){}
    if(!qs.length){area.innerHTML='<p style="color:var(--acc)">Quiz generation failed. Try again.</p>';return;}
    let score=0,answered=0;
    area.innerHTML='<h4 style="color:var(--trd);margin-bottom:14px">📝 '+topic+' Quiz ('+qs.length+' questions)</h4>';
    qs.forEach((q,i)=>{
      const div=document.createElement('div');div.className='trd-q';
      const opts=(q.options||['A) Option 1','B) Option 2','C) Option 3','D) Option 4']).map((o,oi)=>{
        const letter=String.fromCharCode(65+oi);
        return `<label><input type="radio" name="tq${i}" value="${letter}" onchange="checkTrdAns(${i},'${letter}','${(q.answer||'A').charAt(0)}','${(q.explanation||'').replace(/'/g,"\\'")}')"/> ${o}</label>`;
      }).join('');
      div.innerHTML=`<div class="qn">${i+1}. ${q.q||'Question '+(i+1)}</div><div class="qo">${opts}</div><div class="trd-result" id="trd-r-${i}"></div>`;
      area.appendChild(div);
    });
    const scoreDiv=document.createElement('div');scoreDiv.id='trd-score';scoreDiv.style.cssText='text-align:center;padding:14px;color:var(--ts);font-size:.85rem';scoreDiv.textContent='Answer all questions to see your score';area.appendChild(scoreDiv);
  }catch(e){area.innerHTML='<p style="color:var(--acc)">Error: '+e.message+'</p>';}
}

let _trdScores={};
function checkTrdAns(idx,selected,correct,explanation){
  const res=document.getElementById('trd-r-'+idx);if(!res)return;
  const isCorrect=selected===correct;
  _trdScores[idx]=isCorrect;
  res.style.display='block';
  res.className='trd-result '+(isCorrect?'correct':'wrong');
  res.innerHTML=(isCorrect?'✅ Correct!':'❌ Wrong! Correct: '+correct)+(explanation?' — '+explanation:'');
  const total=document.querySelectorAll('[id^="trd-r-"]').length;
  const answered=Object.keys(_trdScores).length;
  const score=Object.values(_trdScores).filter(Boolean).length;
  const scoreDiv=document.getElementById('trd-score');
  if(scoreDiv) scoreDiv.textContent=answered+'/'+total+' answered · Score: '+score+'/'+answered+' ('+Math.round(score/answered*100)+'%)';
}

async function trdAnalyze(){
  const input=(document.getElementById('trd-an-input').value||'').trim();
  if(!input){toast('Describe your trade setup','er');return;}
  const res=document.getElementById('trd-analysis-result');
  res.style.display='block';
  res.innerHTML='<div class="thi"><div class="tsp"></div><span>Analyzing trade...</span></div>';
  try{
    const analysis=await qCall('Analyze this trade setup and provide professional guidance:\n\n'+input+'\n\nProvide:\n1. **Trade Assessment** — is this a good setup?\n2. **Entry Strategy** — optimal entry point\n3. **Stop Loss** — where to place SL and why\n4. **Take Profit** — TP levels\n5. **Risk/Reward** — calculate R:R ratio\n6. **Confidence Level** — rate this setup 1-10\n7. **Additional Notes** — key warnings or tips\n\n⚠️ Note: This is educational analysis only, not financial advice.',mdl,SYS.trading);
    res.innerHTML=window.marked?marked.parse(analysis):analysis.replace(/\n/g,'<br>');
  }catch(e){res.innerHTML='<p style="color:var(--acc)">Analysis failed: '+e.message+'</p>';}
}

function calcPosition(){
  const bal=parseFloat(document.getElementById('calc-balance').value)||1000;
  const risk=parseFloat(document.getElementById('calc-risk').value)||2;
  const sl=parseFloat(document.getElementById('calc-sl').value)||20;
  const pip=parseFloat(document.getElementById('calc-pip').value)||10;
  const riskAmt=bal*(risk/100);
  const lots=(riskAmt/(sl*pip)).toFixed(2);
  const res=document.getElementById('calc-result');
  res.style.display='block';
  res.innerHTML=`💰 Risk Amount: $${riskAmt.toFixed(2)}<br>📊 Lot Size: ${lots} lots<br>📉 Max Loss: $${riskAmt.toFixed(2)} (${risk}% of account)`;
}

function calcRR(){
  const entry=parseFloat(document.getElementById('rr-entry').value)||0;
  const sl=parseFloat(document.getElementById('rr-sl').value)||0;
  const tp=parseFloat(document.getElementById('rr-tp').value)||0;
  if(!entry||!sl||!tp){toast('Fill all fields','er');return;}
  const risk=Math.abs(entry-sl);
  const reward=Math.abs(tp-entry);
  const ratio=(reward/risk).toFixed(2);
  const res=document.getElementById('rr-result');
  res.style.display='block';
  const isLong=tp>entry;
  const color=parseFloat(ratio)>=2?'var(--trg)':parseFloat(ratio)>=1?'var(--trd)':'var(--trr)';
  res.style.color=color;
  res.innerHTML=`${isLong?'📈 Long':'📉 Short'} Trade<br>Risk: ${(risk*10000).toFixed(1)} pips<br>Reward: ${(reward*10000).toFixed(1)} pips<br>R:R Ratio: 1:${ratio} ${parseFloat(ratio)>=2?'✅ Good setup!':parseFloat(ratio)>=1?'⚠️ Acceptable':'❌ Poor R:R'}`;
}

async function genTradeIdea(){
  const pair=document.getElementById('idea-pair').value;
  const tf=document.getElementById('idea-tf').value;
  const res=document.getElementById('idea-result');
  res.style.display='block';
  res.innerHTML='<div class="thi"><div class="tsp"></div><span>Generating trade idea...</span></div>';
  try{
    const idea=await qCall('Generate a realistic trade idea for '+pair+' on the '+tf+' timeframe.\n\nInclude:\n1. **Direction** (Long/Short)\n2. **Entry Zone** (price range)\n3. **Stop Loss** (price + reason)\n4. **Take Profit 1, 2, 3** (multiple targets)\n5. **Setup Description** (what pattern/signal)\n6. **Confluence Factors** (why this trade)\n7. **Risk Warning**\n\nMake it realistic and educational.',mdl,SYS.trading);
    res.innerHTML=window.marked?marked.parse(idea):idea.replace(/\n/g,'<br>');
  }catch(e){res.innerHTML='<p style="color:var(--acc)">Error: '+e.message+'</p>';}
}

// ══════════════════════════════
// SMART SEND — short/deep logic + auto image + YouTube embed
// ══════════════════════════════
// Detect if message is requesting image
function isImgReq(msg){
  return /\b(image|picture|photo|draw|generate|create|make|show)\b.*\b(image|picture|photo|art|illustration|graphic|logo|banner|design|painting)\b|\b(image|picture|draw|generate)\b/i.test(msg);
}
// Detect if message needs YouTube video
function needsYT(msg){
  return /\b(video|watch|tutorial|explain visually|show me video|youtube|lecture|course video|learn from video)\b/i.test(msg);
}
// Detect deep/complex topic
function isDeepTopic(msg){
  const deep=/\b(explain|how does|why|difference between|compare|analyze|write code|algorithm|implement|create a|step by step|in detail|complete guide|full|comprehensive|research|history of|what is the|meaning of)\b/i;
  const short=/^(hi|hello|thanks|ok|yes|no|sure|cool|great|bye|salam|assalam|kya hal|theek ho)/i;
  return !short.test(msg.trim()) && (deep.test(msg) || msg.length > 80 || msg.split(' ').length > 12);
}
// Detect language of message
function detectLang(msg){
  if(/[\u0600-\u06FF]/.test(msg)) return 'arabic';
  if(/[آاابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئ]/.test(msg) || /\b(kya|hai|hain|ka|ki|ke|aur|jo|nahi|ap|mujhe|kro|bta|btao|agr|agar|tum|hum|yeh|woh|ise|usse|mera|meri|kaise|kab|kaha|kyun|kuch)\b/i.test(msg)) return 'urdu';
  return 'english';
}
// Extract YouTube search query from message
function ytQuery(msg){
  return msg.replace(/\b(show me|find|search|watch|tutorial on|video about|youtube|lecture on|explain via video)\b/gi,'').trim().replace(/[?!.]/g,'').substring(0,80);
}
// Generate auto image prompt from topic
async function autoGenImage(topic){
  const prompt=await qCall('Create a short, vivid image generation prompt (max 20 words) for: "'+topic+'". Return ONLY the prompt, no explanation.','llama-3.1-8b-instant');
  return (prompt||topic).substring(0,200).replace(/"/g,'');
}


// ══════════════════════════════
// VOICE (Input only)
// ══════════════════════════════
let vOn=false,vRec=null;
function togV(){vOn?stpV():strtV();}
function strtV(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Voice not supported','er');return;}vRec=new SR();vRec.lang='en-US';vRec.interimResults=true;vRec.onstart=()=>{vOn=true;document.getElementById('vbtn').classList.add('on');shVI();toast('Listening...','in');};vRec.onresult=e=>{let t='';for(let i=e.resultIndex;i<e.results.length;i++)t+=e.results[i][0].transcript;document.getElementById('mi').value=t;aS(document.getElementById('mi'));};vRec.onend=()=>{vOn=false;document.getElementById('vbtn').classList.remove('on');rmVI();const v=document.getElementById('mi').value.trim();if(v)setTimeout(sendMsg,400);};vRec.onerror=e=>{vOn=false;document.getElementById('vbtn').classList.remove('on');rmVI();if(e.error!=='aborted')toast('Voice error: '+e.error,'er');};vRec.start();}
function stpV(){if(vRec)vRec.stop();vOn=false;document.getElementById('vbtn').classList.remove('on');rmVI();}
function shVI(){if(document.getElementById('vi'))return;const el=document.createElement('div');el.id='vi';el.className='vi';el.innerHTML='<div class="vp"></div><span>Listening... speak now</span><button onclick="stpV()" style="background:none;border:none;color:var(--acc);cursor:pointer;margin-left:8px;font-size:.8rem">Stop</button>';document.querySelector('.ia').insertBefore(el,document.querySelector('.iw'));}
function rmVI(){const e=document.getElementById('vi');if(e)e.remove();}
function spk(text){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance((text||'').replace(/[#*`_\[\]()]/g,'').substring(0,2000));u.rate=.9;u.pitch=1;const vs=window.speechSynthesis.getVoices();const pv=vs.find(v=>v.lang.startsWith('en')&&v.name.includes('Google'))||vs.find(v=>v.lang.startsWith('en'))||vs[0];if(pv)u.voice=pv;window.speechSynthesis.speak(u);}

// ══════════════════════════════
// UTILITIES
// ══════════════════════════════
function swlc(){document.getElementById('wlc').classList.remove('h');document.getElementById('msgs').innerHTML='';}
function hwlc(){document.getElementById('wlc').classList.add('h');}
function clrMsgs(){document.getElementById('msgs').innerHTML='';hist=[];}
function clrChat(){if(confirm('Clear this chat?')){clrMsgs();swlc();toast('Cleared','in');}}
function scr(){const c=document.getElementById('chat');c.scrollTo({top:c.scrollHeight,behavior:'smooth'});}
function togSB(){const s=document.getElementById('sb');window.innerWidth<=768?s.classList.toggle('mob'):s.classList.toggle('col');}
function hideSpl(){const s=document.getElementById('splash');if(s){s.classList.add('out');setTimeout(()=>s.remove(),700);}}
function esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
function md2html(t){return (t||'').replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/^[-•] (.+)$/gm,'<li>$1</li>').replace(/\n\n/g,'</p><p>').replace(/^/,'<p>').replace(/$/,'</p>');}
function opn(id){document.getElementById('mov').classList.add('show');const m=document.getElementById(id);m.style.display='block';setTimeout(()=>m.classList.add('show'),10);}
function cls(){document.getElementById('mov').classList.remove('show');document.querySelectorAll('.modal').forEach(m=>{m.classList.remove('show');setTimeout(()=>{m.style.display='none';},200);});}
function toast(msg,type='in'){const w=document.getElementById('twrap');const icons={ok:'✅',er:'❌',in:'ℹ️'};const t=document.createElement('div');t.className='tst '+(type==='ok'?'ok':type==='er'?'er':'in');t.innerHTML='<span>'+icons[type]+'</span><span>'+msg+'</span>';w.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(16px)';t.style.transition='.3s';setTimeout(()=>t.remove(),300);},3500);}
function expChat(){const ms=Array.from(document.querySelectorAll('.msg')).map(m=>'['+(m.classList.contains('u')?'User':'MI AI')+']\n'+(m.querySelector('.mb')?.innerText||'')+'').join('\n---\n\n');const b=new Blob(['MI AI Chat Export\n'+new Date().toLocaleString()+'\nBy Muaaz Iqbal | Muslim Islam Org\n\n'+ms],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='MI-AI-chat-'+Date.now()+'.txt';a.click();toast('Exported!','ok');}

// INIT
// ══════════════════════════════
// CLICK SOUND SYSTEM
// ══════════════════════════════
const _AudioCtx = window.AudioContext || window.webkitAudioContext;
let _actx = null;
function getACtx(){if(!_actx){try{_actx=new _AudioCtx();}catch(e){}}return _actx;}
function playClick(type){
  const ac=getACtx();if(!ac)return;
  try{
    const t=ac.currentTime;
    const osc=ac.createOscillator(),gain=ac.createGain();
    osc.connect(gain);gain.connect(ac.destination);
    const c={click:{f:800,f2:400,d:.06,v:.07,tp:'square'},soft:{f:600,f2:400,d:.05,v:.04,tp:'sine'},send:{f:1200,f2:650,d:.12,v:.07,tp:'sine'},error:{f:220,f2:160,d:.18,v:.06,tp:'sawtooth'},success:{f:880,f2:1100,d:.15,v:.07,tp:'sine'},nav:{f:520,f2:720,d:.08,v:.04,tp:'sine'}}[type||'click']||{f:700,f2:400,d:.07,v:.06,tp:'sine'};
    osc.type=c.tp;osc.frequency.setValueAtTime(c.f,t);osc.frequency.exponentialRampToValueAtTime(c.f2,t+c.d);
    gain.gain.setValueAtTime(c.v,t);gain.gain.exponentialRampToValueAtTime(.001,t+c.d);
    osc.start(t);osc.stop(t+c.d);
  }catch(e){}
}
function attachClickSounds(){
  document.querySelectorAll('button:not([data-ns]),a:not([data-ns]),.ni,.ws,.game-card,.trd-card').forEach(el=>{
    if(el._snd)return;el._snd=true;
    el.addEventListener('mousedown',()=>{
      if(el.classList.contains('ni')||el.id==='sbt')playClick('nav');
      else if(el.classList.contains('game-card')||el.classList.contains('ws'))playClick('soft');
      else playClick('click');
    });
  });
}

// ══════════════════════════════
// DRAGGABLE MUSIC BUTTON
// ══════════════════════════════
function makeDraggable(btnId,panelId){
  const btn=document.getElementById(btnId);if(!btn)return;
  let drag=false,sx,sy,ox,oy,moved=false;
  btn.style.cursor='grab';
  function startD(cx,cy){drag=true;moved=false;sx=cx;sy=cy;const r=btn.getBoundingClientRect();ox=r.left;oy=r.top;btn.style.transition='none';}
  function moveD(cx,cy){if(!drag)return;const dx=cx-sx,dy=cy-sy;if(Math.abs(dx)>4||Math.abs(dy)>4)moved=true;const nx=Math.max(4,Math.min(window.innerWidth-btn.offsetWidth-4,ox+dx));const ny=Math.max(4,Math.min(window.innerHeight-btn.offsetHeight-4,oy+dy));btn.style.right='auto';btn.style.bottom='auto';btn.style.left=nx+'px';btn.style.top=ny+'px';const p=document.getElementById(panelId);if(p&&p.classList.contains('show')){p.style.right='auto';p.style.bottom='auto';p.style.left=nx+'px';p.style.top=(ny-p.offsetHeight-8)+'px';}}
  function endD(){if(!drag)return;drag=false;btn.style.cursor='grab';btn.style.transition='';try{localStorage.setItem('mbp',JSON.stringify({l:btn.style.left,t:btn.style.top}));}catch(e){}}
  btn.addEventListener('mousedown',e=>{startD(e.clientX,e.clientY);e.preventDefault();});
  document.addEventListener('mousemove',e=>{moveD(e.clientX,e.clientY);});
  document.addEventListener('mouseup',endD);
  btn.addEventListener('touchstart',e=>{const t=e.touches[0];startD(t.clientX,t.clientY);},{passive:false});
  document.addEventListener('touchmove',e=>{if(!drag)return;const t=e.touches[0];moveD(t.clientX,t.clientY);e.preventDefault();},{passive:false});
  document.addEventListener('touchend',endD);
  try{const sv=JSON.parse(localStorage.getItem('mbp')||'{}');if(sv.l){btn.style.right='auto';btn.style.bottom='auto';btn.style.left=sv.l;btn.style.top=sv.t;}}catch(e){}
}
document.addEventListener('DOMContentLoaded',()=>{
  if(window.marked)marked.setOptions({breaks:true,gfm:true});
  setTimeout(()=>{
    if(!CU){hideSpl();document.getElementById('auth').classList.add('show');}
    // Try autoplay after splash (some browsers allow after user interacted with page load)
    setTimeout(startMusic,400);
  },2700);
  // Also try on first user click (guaranteed autoplay unlock)
  document.addEventListener('click',function unlockMusic(){
    if(!musicPlaying&&!musicInited)startMusic();
    document.removeEventListener('click',unlockMusic);
  },{once:true});
  document.addEventListener('click',e=>{if(window.innerWidth<=768){const s=document.getElementById('sb');if(s.classList.contains('mob')&&!s.contains(e.target)&&!e.target.closest('.mmb'))s.classList.remove('mob');}});
  // Load TTS voices
  if(window.speechSynthesis){window.speechSynthesis.onvoiceschanged=()=>{window.speechSynthesis.getVoices();};}

  // Attach click sounds
  attachClickSounds();
  new MutationObserver(()=>attachClickSounds()).observe(document.body,{childList:true,subtree:true});

  // Draggable music button (after render)
  setTimeout(()=>makeDraggable('music-btn','music-panel'),600);
});
