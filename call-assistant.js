// ════════════════════════════════════════════════════════════════════════════════
// MI AI — LIVE AI CALL SYSTEM v4.1 (ULTIMATE REAL CALL EXPERIENCE - DETAILED)
// By Muaaz Iqbal | Muslim Islam Org
// FEATURES: 
// - Auto Call End on "Bye/Allah Hafiz" (Smart Disconnect)
// - High Comfort Listening (1.9s Silence Timer, No Cut-offs)
// - Zero Double-Mic Bugs (Strict Generation Tracking)
// - Strict Factual Responses & Emotional TTS
// ════════════════════════════════════════════════════════════════════════════════

// ── GLOBAL CALL STATES (System ki halat track karne ke liye variables) ──
let callActive = false;      // Call chal rahi hai ya nahi
let callMuted = false;       // User ka microphone mute hai?
let callRec = null;          // SpeechRecognition ka main object
let callSpeaking = false;    // Kya AI is waqt bol raha hai? (Mic off rakhne ke liye)
let callHistory = [];        // Call ke doran hone wali baaton ka record
let callLang = 'en-US';      // Default language English set hai
let callLangLabel = 'English'; 
let callListenGen = 0;       // Double/Triple mic start bugs ko block karne ka token
let callSilenceTimer = null; // User ki aawaz ke baad 1.9s ka pause track karne ka timer

// ════════════════════════════════════════════════════════════════════════════════
// 1. START CALL FUNCTION (UI Setup & Microphone Permissions)
// ════════════════════════════════════════════════════════════════════════════════
function startCall(lang, langLabel) {
  // Check karna ke browser mein Voice Recognition support hai ya nahi
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if(typeof toast === 'function') toast('Use Google Chrome for voice call features', 'er');
    return;
  }

  // Agar language pass nahi ki gayi, to Language Picker Screen dikhao
  if (!lang) {
    const _ov = document.getElementById('call-overlay');
    _ov.classList.add('show');
    _ov.style.display = 'flex';
    
    // Premium UI for Language Selection
    _ov.innerHTML = `
      <div style="font-size:4.5rem;margin-bottom:15px;text-shadow: 0 0 20px var(--p)">🤖</div>
      <div style="font-size:1.6rem;font-weight:800;color:#fff;margin-bottom:8px">MI AI Live Call</div>
      <div style="font-size:0.9rem;color:var(--ts);margin-bottom:25px">Choose your preferred language / زبان منتخب کریں</div>
      
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;max-width:350px">
        <button onclick="startCall('en-US','English')" style="padding:14px 22px;border-radius:12px;background:var(--bgi);border:2px solid var(--p);color:var(--pl);font-size:1rem;cursor:pointer;font-family:var(--fm);font-weight:bold;transition:0.3s">🇬🇧 English</button>
        <button onclick="startCall('ur-PK','Urdu')" style="padding:14px 22px;border-radius:12px;background:var(--bgi);border:2px solid var(--gold);color:var(--gold);font-size:1rem;cursor:pointer;font-family:var(--fa);font-weight:bold;transition:0.3s">🇵🇰 اردو</button>
        <button onclick="startCall('ar-SA','Arabic')" style="padding:14px 22px;border-radius:12px;background:var(--bgi);border:2px solid var(--s);color:var(--s);font-size:1rem;cursor:pointer;font-family:var(--fa);font-weight:bold;transition:0.3s">🇸🇦 عربی</button>
        <button onclick="startCall('hi-IN','Hindi')" style="padding:14px 22px;border-radius:12px;background:var(--bgi);border:2px solid var(--ts);color:var(--ts);font-size:1rem;cursor:pointer;font-family:var(--fm);font-weight:bold;transition:0.3s">🇮🇳 Hindi</button>
      </div>
      
      <button onclick="endCall()" style="margin-top:25px;padding:12px 30px;border-radius:12px;background:#e74c3c;border:none;color:#fff;cursor:pointer;font-size:1rem;font-weight:bold;box-shadow: 0 4px 15px rgba(231,76,60,0.4)">❌ Cancel Call</button>
    `;
    return;
  }

  // State Variables Setup
  callLang = lang; 
  callLangLabel = langLabel || 'English';
  callActive = true;
  callHistory = [];
  callMuted = false;
  callListenGen++; // Purane mic sessions ko kill karne ke liye ID update
  
  if(typeof pauseMusicForCall === 'function') pauseMusicForCall();

  // Main Call Screen UI Rendering
  const ov2 = document.getElementById('call-overlay');
  ov2.classList.add('show');
  ov2.style.display = 'flex';
  ov2.innerHTML = `
    <div class="call-avatar" id="call-avatar" style="font-size:4rem; transition: transform 0.3s ease;">🤖</div>
    <div class="call-name" style="font-size:1.4rem; font-weight:bold; margin-top:10px;">MI AI Assistant</div>
    <span class="call-lang-badge" style="margin-top:5px; padding:4px 12px; border-radius:20px; background:rgba(255,255,255,0.1); font-size:0.85rem;">
      ${callLangLabel === 'Urdu' || callLangLabel === 'Arabic' ? '<span class="call-rtl">' + callLangLabel + '</span>' : callLangLabel} 🎙️
    </span>
    
    <div class="call-wave" id="call-wave" style="margin:25px 0;"><span></span><span></span><span></span><span></span><span></span></div>
    
    <div class="call-status" id="call-status" style="font-size:1.1rem; color:var(--p); font-weight:bold;">📞 Ringing...</div>
    
    <div class="call-transcript" id="call-transcript" style="min-height:30px; margin-top:10px; font-size:1rem; color:#fff; ${callLang === 'ur-PK' || callLang === 'ar-SA' ? 'direction:rtl;font-family:var(--fa)' : ''}"></div>
    
    <div id="call-ai-text" style="font-size:0.9rem;color:var(--ts);max-width:340px;text-align:center;padding:10px 18px;line-height:1.6;min-height:50px; ${callLang === 'ur-PK' || callLang === 'ar-SA' ? 'direction:rtl;font-family:var(--fa)' : ''}"></div>
    
    <div class="call-btns" style="margin-top:auto; padding-bottom:40px; display:flex; gap:20px;">
      <button class="call-btn mute" id="call-mute-btn" onclick="toggleCallMute()" title="Mute/Unmute" style="width:60px;height:60px;font-size:1.5rem;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,0.1);color:#fff;">🎤</button>
      <button class="call-btn end" onclick="endCall()" title="End Call" style="width:60px;height:60px;font-size:1.5rem;border-radius:50%;border:none;cursor:pointer;background:#e74c3c;color:#fff;box-shadow: 0 0 15px rgba(231,76,60,0.5);">📵</button>
    </div>
  `;
  setWaveMode('ringing');

  // Mic Permission Request - Fake Ringing Delay for Realism
  requestMicPermission().then(() => {
    if (!callActive) return;
    setCallStatus('☎️ Establishing secure connection...');
    
    setTimeout(() => {
      if (!callActive) return;
      setCallStatus('✅ Connected!');
      greetCall(); // AI ki pehli aawaz
    }, 1200);
  }).catch(() => {
    if (!callActive) return;
    setCallStatus('⚠️ Microphone permission denied');
    if(typeof toast === 'function') toast('Please allow microphone access in browser settings', 'er');
  });
}

// Background tabs mein mic band karne ka helper
function requestMicPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return Promise.resolve();
  }
  return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    stream.getTracks().forEach(t => t.stop()); // Permission le kar track band kardo taake background icon na aaye
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. AI INITIAL GREETING (Pehla Jawab)
// ════════════════════════════════════════════════════════════════════════════════
async function greetCall() {
  setCallStatus('🤖 MI AI is speaking...');
  setWaveMode('ai');
  
  // Language ke hisaab se professional greetings
  const greetings = {
    'en-US': 'Assalamu Alaikum! I am MI AI, your intelligent assistant by Muaaz Iqbal from Muslim Islam Org. How can I assist you today?',
    'ur-PK': 'السلام علیکم! میں MI AI ہوں، معاذ اقبال کا ذہین اسسٹنٹ۔ بتائیے، آج میں آپ کی کیا مدد کر سکتا ہوں؟',
    'ar-SA': 'السلام عليكم! أنا MI AI، مساعدك الذكي من معاذ إقبال. كيف يمكنني مساعدتك اليوم؟',
    'hi-IN': 'Assalamu Alaikum! Main MI AI hoon, Muaaz Iqbal ka intelligent assistant. Aaj main aapki kaise madad karoon?'
  };
  
  const greeting = greetings[callLang] || greetings['en-US'];
  
  // Chat history mein AI ka pehla message save karo
  callHistory.push({ role: 'assistant', content: greeting });
  setCallAIText(greeting);
  
  await speakCall(greeting); // Pehle AI apni baat puri karega
  if (callActive && !callMuted) beginListenCycle(); // Phir mic on hoga
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. COMFORTABLE LISTENING ENGINE (Sukoon se sunne wala system)
// ════════════════════════════════════════════════════════════════════════════════
function beginListenCycle() {
  if (!callActive || callMuted || callSpeaking) return;
  callListenGen++; // Naya session start
  startCallListening(callListenGen);
}

function startCallListening(gen) {
  if (!callActive || callMuted || callSpeaking) return;
  if (gen !== callListenGen) return; // Agar ye purana session hai, to ignore karo

  // Agar pehle se koi mic session on hai to usko aggressively band karo
  if (callRec) {
    try { callRec.onend = null; callRec.onerror = null; callRec.onresult = null; callRec.stop(); } catch(e) {}
    callRec = null;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  callRec = rec;
  
  rec.lang = callLang || 'en-US';
  
  // ── THE COMFORT FIX ──
  // interimResults = false: Ye AI ko beech me jump karne se rokta hai. AI kache lafz nahi sunta.
  rec.interimResults = false;
  rec.continuous = true; 
  
  let finalText = '';

  function clearSilenceTimer() {
    if (callSilenceTimer) { clearTimeout(callSilenceTimer); callSilenceTimer = null; }
  }
  
  function armSilenceTimer() {
    clearSilenceTimer();
    // ── 1.9 SECONDS GOLDEN PAUSE ──
    // Ye time sabse best hai. Insaan jab bolte bolte saans leta hai to 1 sec lagta hai.
    // 1.9 seconds ka matlab hai user ne waqai apni baat mukammal kar li hai.
    callSilenceTimer = setTimeout(() => {
      if (gen !== callListenGen) return;
      if (finalText.trim()) {
        try { rec.stop(); } catch(e) {}
      }
    }, 1900);
  }

  rec.onstart = () => {
    if (gen !== callListenGen) return;
    setCallStatus('🎙️ Listening... speak now');
    setWaveMode('listening');
  };
  
  rec.onresult = e => {
    if (gen !== callListenGen) return;
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    setCallTranscript(finalText + interim);
    armSilenceTimer(); // Har naye lafz par 1.9s ka timer reset hoga
  };
  
  rec.onend = () => {
    clearSilenceTimer();
    if (gen !== callListenGen || !callActive) return; 
    
    const heard = finalText.trim();
    if (heard) {
      processCallInput(heard); // Agar aawaz aayi to process karo
    } else if (!callMuted && !callSpeaking) {
      // Agar chup raha user, to khamoshi se dubara sunna shuru karo bina beep ke
      setTimeout(() => { if (gen === callListenGen) beginListenCycle(); }, 400);
    }
  };
  
  rec.onerror = e => {
    clearSilenceTimer();
    if (gen !== callListenGen || !callActive) return;
    
    // Agar no-speech error hai to aram se restart karo
    if (e.error === 'no-speech' || e.error === 'aborted') {
      if (!callMuted && !callSpeaking) setTimeout(() => { if (gen === callListenGen) beginListenCycle(); }, 400);
      return;
    }
    
    setCallStatus('⚠️ Network/Mic error — retrying...');
    if (!callMuted && !callSpeaking) setTimeout(() => { if (gen === callListenGen) beginListenCycle(); }, 1200);
  };

  try { rec.start(); } catch(e) { setCallStatus('Mic error: ' + e.message); }
}

function stopListening() {
  callListenGen++; // Ensure old loops die
  if (callSilenceTimer) { clearTimeout(callSilenceTimer); callSilenceTimer = null; }
  if (callRec) {
    try { callRec.onend = null; callRec.onerror = null; callRec.onresult = null; callRec.stop(); } catch(e) {}
    callRec = null;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. PROCESS CALL INPUT & ADVANCED AUTO-DISCONNECT
// ════════════════════════════════════════════════════════════════════════════════
async function processCallInput(text) {
  if (!callActive) return;
  stopListening(); // Mic completely off taake background noise API ko na jaye
  
  setCallTranscript('🗣️ ' + text);
  setCallAIText('');
  
  // ── ADVANCED AUTO CALL BAND (DISCONNECT) SYSTEM ──
  const cleanInput = text.toLowerCase().trim();
  
  // Ye words detect hotay hi AI khud call kaat dega
  const endKeywords = [
    'call band', 'band kar do', 'call kat', 'call kato', 'bye', 'allah hafiz', 
    'khuda hafiz', 'end call', 'disconnect', 'tata', 'phone kato', 'phun kato',
    'alvida', 'stop call', 'close call', 'goodbye', 'band karo', 'bad kar do', 'rakh do phone'
  ];
  
  const userWantsToHangUp = endKeywords.some(keyword => cleanInput.includes(keyword));
  
  if (userWantsToHangUp) {
    setCallStatus('🤖 Disconnecting gracefully...');
    setWaveMode('ai');
    
    // Alvida kehne ke liye pyare sentences
    let goodbyeText = 'Allah Hafiz! Apna khayal rakhiyega. Call band ki ja rahi hai.';
    if (callLang === 'en-US') goodbyeText = 'Goodbye! Take care of yourself, disconnecting the call now.';
    if (callLang === 'ar-SA') goodbyeText = 'مع السلامة! في أمان الله، يتم إنهاء المكالمة الآن.';
    if (callLang === 'hi-IN') goodbyeText = 'Alvida! Apna dhyan rakhna. Call disconnect ki ja rahi hai.';
    
    setCallAIText(goodbyeText);
    await speakCall(goodbyeText); // Pehle tameez se goodbye bolega
    endCall();                    // Uske baad background se disconnect kar dega
    return;
  }

  callHistory.push({ role: 'user', content: text });
  setCallStatus('⚡ Thinking securely...');
  setWaveMode('silent');
  
  try {
    // ── STRICT FACTUAL SYSTEM PROMPT ──
    const sys = `You are MI AI — a reliable, smart, and concise voice assistant by Muaaz Iqbal (Muslim Islam Org).
STRICT CALL RULES:
- Reply STRICTLY based on the user's prompt. No assumptions, no storytelling.
- MAXIMUM 1 to 2 short sentences. Absolutely NEVER generate paragraphs.
- Keep it raw text. NO markdown formatting, NO bullets, NO headers, NO bold text.
- Sound conversational, polite, and like a real human on a voice call.
- If they ask a deeply complex question, give a one-sentence summary and add: "I can explain more if you want."`;

    const callModel = 'llama-3.1-8b-instant'; // Fast API for minimal latency
    
    // Assuming qCall is your external API handler
    const resp = await qCall(text, callModel, sys, callHistory.slice(-6));
    
    // Regex cleanup to remove any AI formatting symbols that TTS engine might try to pronounce
    const clean = (resp || '').replace(/[*_#`\[\]]/g, '').replace(/\n+/g, ' ').trim();
    
    callHistory.push({ role: 'assistant', content: clean });
    setCallAIText(clean);
    
    setCallStatus('🤖 Speaking...');
    setWaveMode('ai');
    
    await speakCall(clean);
    if (callActive && !callMuted) beginListenCycle(); // AI ka jawab mukammal hote hi wapas sunna
    
  } catch(e) {
    console.error('Call processing error:', e);
    if (!callActive) return;
    setCallStatus('⚠️ Connection glitch, retrying...');
    if (!callMuted) setTimeout(beginListenCycle, 1000);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. REALISTIC EMOTIONAL TTS ENGINE
// ════════════════════════════════════════════════════════════════════════════════
function speakCall(text) {
  return new Promise(res => {
    callSpeaking = true;
    stopListening(); // Security: Mic MUST be off when AI is talking
    window.speechSynthesis.cancel();
    
    // Garbage collection & max limit cleanup
    const clean = (text || '').replace(/[#*`_\[\]()\u200B-\u200D]/g, '').replace(/\n+/g, ' ').trim().substring(0, 500);
    if (!clean) { callSpeaking = false; res(); return; }

    // Emotion Detection (Words check kar ke pitch aur speed adjust karna)
    const isHappy = /happy|great|amazing|wonderful|love|haha|lol|خوش|شکریہ|اچھا|سعيد|يسعدني|alhamdulillah/i.test(clean);
    const isSad = /sorry|sad|difficult|افسوس|مشکل|أسف|حزين|apologize/i.test(clean);
    const isExcited = /wow|excellent|fantastic|incredible|بہترین|شاندار|رائع/i.test(clean);

    const u = new SpeechSynthesisUtterance(clean);
    
    // Speed (Rate) and Pitch Logic
    u.rate = isExcited ? 1.08 : isSad ? 0.88 : 0.98; // Human conversational speed is slightly under 1.0
    u.pitch = isHappy || isExcited ? 1.1 : isSad ? 0.9 : 1.02;
    u.volume = 1;
    u.lang = callLang || 'en-US';

    // Best Voice Finder Algorithm
    const voices = window.speechSynthesis.getVoices();
    const tl = (callLang || 'en-US').split('-')[0];
    const pref =
      voices.find(v => v.lang === callLang && v.name.includes('Google')) ||
      voices.find(v => v.lang.startsWith(tl) && v.name.includes('Google')) ||
      voices.find(v => v.lang.startsWith(tl)) ||
      voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
      voices.find(v => v.lang.startsWith('en')) || voices[0];
      
    if (pref) u.voice = pref;

    // Safety Timeouts: Agar kisi wajah se 'onend' fire na ho to call stuck na ho jaye
    const safeDuration = Math.min(clean.length * 110 + 1500, 15000);
    const to = setTimeout(() => { window.speechSynthesis.cancel(); callSpeaking = false; res(); }, safeDuration);
    
    // Chrome Bug Fix: Long TTS pauses automatically, this keeps it alive
    const ka = setInterval(() => { 
      if (!callSpeaking) { clearInterval(ka); return; }
      if (window.speechSynthesis.paused) window.speechSynthesis.resume(); 
    }, 4000);
    
    // Cleanup listeners
    u.onend = () => { clearTimeout(to); clearInterval(ka); callSpeaking = false; res(); };
    u.onerror = () => { clearTimeout(to); clearInterval(ka); callSpeaking = false; res(); };
    
    // Start Speaking
    window.speechSynthesis.speak(u);
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. UI CONTROLS & END CALL LOGIC
// ════════════════════════════════════════════════════════════════════════════════
function endCall() {
  callActive = false;
  stopListening();
  callSpeaking = false;
  window.speechSynthesis.cancel();
  
  // Hide Call UI
  const _endOv = document.getElementById('call-overlay');
  if (_endOv) {
    _endOv.classList.remove('show');
    _endOv.style.display = 'none';
  }
  
  // Generate Call Summary in Chat UI
  if (callHistory.length > 2 && typeof addMsg === 'function') {
    const summary = callHistory.filter(m => m.role === 'user').map(m => m.content).join(' | ');
    addMsg('assistant', `📞 **Call Ended**\n\nThe live AI call has been disconnected. Here is a brief summary of what you asked:\n\n*${summary.substring(0, 400)}${summary.length > 400 ? '...' : ''}*`, true);
  }
  
  if (typeof toast === 'function') toast('Call ended successfully', 'in');
  if (typeof resumeMusicAfterCall === 'function') resumeMusicAfterCall();
}

function toggleCallMute() {
  callMuted = !callMuted;
  const btn = document.getElementById('call-mute-btn');
  if (!btn) return;
  
  if (callMuted) {
    btn.textContent = '🔇';
    btn.style.background = '#e74c3c';
    btn.style.boxShadow = '0 0 15px rgba(231,76,60,0.6)';
    stopListening();
    setCallStatus('Microphone is Muted');
    setWaveMode('silent');
  } else {
    btn.textContent = '🎤';
    btn.style.background = 'rgba(255,255,255,0.1)';
    btn.style.boxShadow = 'none';
    setCallStatus('Microphone Active — listening...');
    beginListenCycle();
  }
}

// Helper Functions for DOM Updates
function setCallStatus(txt) { 
  const el = document.getElementById('call-status'); 
  if (el) el.textContent = txt; 
}
function setCallTranscript(txt) { 
  const el = document.getElementById('call-transcript'); 
  if (el) el.textContent = txt; 
}
function setCallAIText(txt) { 
  const el = document.getElementById('call-ai-text'); 
  if (el) el.textContent = txt ? '🤖 ' + txt.substring(0, 250) + (txt.length > 250 ? '...' : '') : ''; 
}

function setWaveMode(mode) {
  const wave = document.getElementById('call-wave');
  const avatar = document.getElementById('call-avatar');
  if (!wave || !avatar) return;
  
  wave.className = 'call-wave' + (mode === 'ai' ? ' ai' : mode === 'silent' ? ' silent' : mode === 'ringing' ? ' ringing' : '');
  avatar.className = 'call-avatar' + (mode === 'ai' ? ' call-ai-speaking' : mode === 'ringing' ? ' call-ringing' : '');
  
  // Dynamic scale effects
  if (mode === 'ai') {
    avatar.style.transform = 'scale(1.15)';
    avatar.style.textShadow = '0 0 30px var(--p)';
  } else {
    avatar.style.transform = 'scale(1)';
    avatar.style.textShadow = 'none';
  }
}
