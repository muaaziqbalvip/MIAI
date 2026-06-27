// ══════════════════════════════════════════════════════
// MI AI — GAMING HUB (AI Game Generator)
// By Muaaz Iqbal | Muslim Islam Org
// ══════════════════════════════════════════════════════

// ══════════════════════════════
// GAMING HUB
// ══════════════════════════════
let _gameType='Platformer',_gameHTML='',_gameTitle='';
let _gScores=[];
try{_gScores=JSON.parse(localStorage.getItem('mi_g')||'[]');}catch(e){}

function gameTab(id,btn){
  document.querySelectorAll('.game-tab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.game-content').forEach(c=>c.classList.remove('show'));
  if(btn)btn.classList.add('on');
  const el=document.getElementById('gc-'+id);if(el)el.classList.add('show');
  if(id==='scores')renderGScores();
  playClick('nav');
}
function selGameType(btn,type){
  document.querySelectorAll('.game-type-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');_gameType=type;
  document.getElementById('game-log').textContent='Selected: '+type+'. Describe it below and hit Generate!';
  playClick('soft');
}
async function buildGame(){
  const prompt=(document.getElementById('game-prompt').value||'').trim();
  const diff=document.getElementById('game-diff').value;
  const theme=document.getElementById('game-theme').value;
  const btn=document.getElementById('game-gen-btn');
  const log=document.getElementById('game-log');
  if(!prompt){toast('Describe your game!','er');playClick('error');return;}
  btn.disabled=true;btn.textContent='⚡ Building...';
  log.textContent='[1/3] Designing game...';
  playClick('send');
  const sys=`You are an expert HTML5 Canvas game developer. Return ONLY a complete working HTML file — no explanation, no markdown, just raw HTML.
Rules: Use Canvas2D API. 60fps with requestAnimationFrame. Dark theme (bg=#07070E, accent=#7C6FFF, green=#00D4AA). Include: title screen, score HUD, lives, restart. Keyboard+touch controls. Web Audio API for sound effects. Smooth particle effects. localStorage for high score. Fully playable immediately.`;
  const req=`Build a complete ${_gameType} game. Theme: ${theme}. Difficulty: ${diff}. Requirements: ${prompt}. Make it polished, fun, with particles, sounds, and high score system.`;
  log.textContent='[2/3] AI writing game code (may take 20-30s)...';
  try{
    const resp=await qCall(req,'llama-3.3-70b-versatile',sys);
    log.textContent='[3/3] Loading game...';
    let html=resp;
    const m=resp.match(/```html([\s\S]*?)```/i)||resp.match(/```([\s\S]*?)```/);
    if(m)html=m[1].trim();
    if(!html.includes('<html')&&!html.includes('<!DOCTYPE'))html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+_gameType+' Game</title></head><body style="margin:0;background:#07070E;overflow:hidden">'+html+'</body></html>';
    _gameHTML=html;_gameTitle=_gameType+' — '+prompt.substring(0,28);
    log.textContent='✅ Game ready!';
    btn.disabled=false;btn.textContent='⚡ Generate Game with AI';
    playClick('success');toast('Game ready! Loading...','ok');
    setTimeout(()=>{
      // Switch to play tab
      document.querySelectorAll('.game-tab').forEach(b=>b.classList.remove('on'));
      document.querySelectorAll('.game-content').forEach(c=>c.classList.remove('show'));
      const pt=document.querySelector('.game-tab:nth-child(3)');if(pt)pt.classList.add('on');
      const pc=document.getElementById('gc-play');if(pc)pc.classList.add('show');
      launchGame(html,_gameTitle);
    },600);
  }catch(e){
    log.textContent='❌ Error: '+e.message;
    btn.disabled=false;btn.textContent='⚡ Generate Game with AI';
    playClick('error');
  }
}
async function loadPresetGame(id){
  const presets={
    snake:['Snake','Classic snake: eat food, grow longer, avoid walls and self. WASD+arrow keys. 5 speed levels. Wrap-around option.'],
    tetris:['Puzzle','Full Tetris: all 7 tetrominoes, line clearing, speed increase, next piece preview, hold piece, score multiplier for multi-line clears.'],
    flappy:['Platformer','Flappy Bird: tap/click/space to flap through pipes. Scrolling parallax background. Score per pipe. Medal system.'],
    memory:['Card','Memory match: 16 emoji cards (8 pairs), flip animations, move counter, countdown timer, best score tracking.'],
    pong:['Custom','Pong vs AI: smooth paddle physics, AI tracks ball, increasing speed, first to 10 wins, particle effects on hit.'],
    breakout:['Shooter','Breakout: bouncing ball, colored bricks (3 hits for some), power-ups (wide paddle, multi-ball, laser), 3 lives.'],
    quiz_islam:['Quiz','Islamic quiz: 20 questions about Quran, Hadith, prophets, pillars of Islam. Timer per question. Leaderboard.'],
    clicker:['Clicker','Idle clicker: click big glowing button, buy auto-clickers, multipliers, prestige system. Satisfying particles.'],
  };
  const p=presets[id];if(!p)return;
  cls();toast('Building '+id+' game...','in');
  _gameType=p[0];
  // Re-open modal and set values
  opn('game-m');
  await new Promise(r=>setTimeout(r,200));
  const pi=document.getElementById('game-prompt');if(pi)pi.value=p[1];
  document.querySelectorAll('.game-type-btn').forEach(b=>b.classList.remove('on'));
  const firstBtn=document.querySelector('.game-type-btn');if(firstBtn)firstBtn.classList.add('on');
  gameTab('build',document.querySelector('.game-tab'));
  await new Promise(r=>setTimeout(r,300));
  await buildGame();
}
function launchGame(html,title){
  const wrap=document.getElementById('game-frame-wrap'),empty=document.getElementById('game-play-empty');
  const frame=document.getElementById('game-frame'),te=document.getElementById('game-frame-title');
  if(wrap)wrap.style.display='block';if(empty)empty.style.display='none';
  if(te)te.textContent='🎮 '+title;
  if(frame){frame.srcdoc=html;_gameHTML=html;_gameTitle=title;}
  _gScores.unshift({title,date:new Date().toLocaleString()});
  _gScores=_gScores.slice(0,20);
  try{localStorage.setItem('mi_g',JSON.stringify(_gScores));}catch(e){}
}
function restartGame(){
  const f=document.getElementById('game-frame');
  if(f&&_gameHTML){f.srcdoc='';setTimeout(()=>{f.srcdoc=_gameHTML;},80);}
  playClick('click');toast('Restarted!','in');
}
function downloadGame(){
  if(!_gameHTML){toast('No game yet','er');return;}
  const blob=new Blob([_gameHTML],{type:'text/html'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='MI-AI-Game-'+(_gameTitle||'game').replace(/\s+/g,'_').substring(0,22)+'-'+Date.now()+'.html';
  a.click();
  playClick('success');toast('Game downloaded!','ok');
}
function renderGScores(){
  const el=document.getElementById('game-scores-list');if(!el)return;
  if(!_gScores.length){el.innerHTML='<h4 style="color:var(--pl);margin-bottom:14px">🏆 Game History</h4><p style="color:var(--ts)">Play games to see history!</p>';return;}
  el.innerHTML='<h4 style="color:var(--pl);margin-bottom:14px">🏆 Game History</h4>'+_gScores.map((g,i)=>'<div class="score-row"><span class="score-rank">'+(i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1))+'</span><span class="score-name">'+(g.title||'Game')+'</span><span class="score-pts" style="font-size:.72rem;color:var(--tm)">'+(g.date||'')+'</span></div>').join('');
}

// Hook the Gaming sidebar nav item into the game generator modal.
// Runs after app.js has defined sm(); wraps it without breaking other modes.
(function attachGamingNav(){
  function wireOverride(){
    if(typeof window.sm!=='function')return;
    const _smOrig=window.sm;
    window.sm=function(m){
      if(m==='gaming'){ if(typeof playClick==='function')playClick('nav'); opn('game-m'); return; }
      _smOrig(m);
    };
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',wireOverride);
  }else{
    wireOverride();
  }
})();
