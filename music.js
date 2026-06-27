// ══════════════════════════════════════════════════════
// MI AI — BACKGROUND MUSIC PLAYER
// By Muaaz Iqbal | Muslim Islam Org
// ══════════════════════════════════════════════════════

// ══════════════════════════════
// MUSIC PLAYER SYSTEM
// ══════════════════════════════
let musicPlaying=false,musicPanelOpen=false,musicInited=false;
const MUSIC_URL='https://muaaziqbalvip.github.io/Milive2/ilm_aur_fikr_ka_silsila.mp3';

function getMusicEl(){return document.getElementById('bg-music');}

function initMusic(){
  if(musicInited)return;
  musicInited=true;
  const aud=getMusicEl();
  if(!aud)return;
  aud.volume=0.30;
  aud.src=MUSIC_URL;

  // Progress bar update
  aud.addEventListener('timeupdate',()=>{
    if(aud.duration){
      const pct=(aud.currentTime/aud.duration)*100;
      const el=document.getElementById('music-prog');
      if(el)el.style.width=pct+'%';
    }
  });
  aud.addEventListener('ended',()=>{aud.currentTime=0;aud.play();});
  aud.addEventListener('error',(e)=>{console.warn('Music load error:',e);});
}

function startMusic(){
  initMusic();
  const aud=getMusicEl();
  if(!aud)return;
  const p=aud.play();
  if(p!==undefined){
    p.then(()=>{
      musicPlaying=true;
      updMusicUI();
    }).catch(e=>{
      console.warn('Autoplay blocked:',e);
      musicPlaying=false;
      updMusicUI();
    });
  }
}

function toggleMusic(){
  const aud=getMusicEl();
  if(!aud)return;
  if(musicPlaying){
    aud.pause();
    musicPlaying=false;
  }else{
    initMusic();
    aud.play().then(()=>{musicPlaying=true;}).catch(()=>{});
    musicPlaying=true;
  }
  updMusicUI();
}

function toggleMusicPanel(){
  musicPanelOpen=!musicPanelOpen;
  const panel=document.getElementById('music-panel');
  if(panel)panel.classList.toggle('show',musicPanelOpen);
  // Start music when user first opens panel (bypass autoplay block)
  if(musicPanelOpen&&!musicPlaying){startMusic();}
}

function setMusicVol(v){
  const aud=getMusicEl();
  if(aud)aud.volume=v/100;
  const lbl=document.getElementById('vol-label');
  if(lbl)lbl.textContent=v+'%';
}

function updMusicUI(){
  const btn=document.getElementById('music-btn');
  const tbtn=document.getElementById('music-toggle-btn');
  const eq=document.getElementById('music-eq');
  if(btn){btn.textContent=musicPlaying?'🎵':'🔇';btn.classList.toggle('paused',!musicPlaying);}
  if(tbtn){tbtn.textContent=musicPlaying?'⏸ Pause Music':'▶ Play Music';tbtn.className='music-toggle '+(musicPlaying?'on':'off');}
  if(eq)eq.classList.toggle('paused',!musicPlaying);
}

// Pause music during call, resume after
function pauseMusicForCall(){
  const aud=getMusicEl();
  if(aud&&musicPlaying){aud.pause();window._musicWasPlaying=true;}
}
function resumeMusicAfterCall(){
  const aud=getMusicEl();
  if(aud&&window._musicWasPlaying){
    aud.play().then(()=>{musicPlaying=true;updMusicUI();}).catch(()=>{});
    window._musicWasPlaying=false;
  }
}

// Pause during serious modes (pro/code)
function handleMusicForMode(m){
  const aud=getMusicEl();
  if(!aud)return;
  const serious=['pro','code','files'];
  if(serious.includes(m)&&musicPlaying){
    aud.volume=0.08;// dim music in serious mode
  }else if(!serious.includes(m)&&musicPlaying){
    aud.volume=parseFloat(document.getElementById('music-vol')?.value||30)/100;
  }
}
