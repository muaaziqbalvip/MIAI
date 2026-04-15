// ============================================
// MI AI - Firebase Configuration & Auth
// By Muaaz Iqbal | Muslim Islam Org
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyBbnU8DkthpYQMHOLLyj6M0cc05qXfjMcw",
  authDomain: "ramadan-2385b.firebaseapp.com",
  databaseURL: "https://ramadan-2385b-default-rtdb.firebaseio.com",
  projectId: "ramadan-2385b",
  storageBucket: "ramadan-2385b.firebasestorage.app",
  messagingSenderId: "882828936310",
  appId: "1:882828936310:web:7f97b921031fe130fe4b57"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// ---- Current User State ----
let currentUser = null;
let currentChatId = null;
let allChats = {};

// ---- Auth State Observer ----
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    onUserLoggedIn(user);
  } else {
    currentUser = null;
    onUserLoggedOut();
  }
});

// ---- Login with Email/Password ----
async function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    showToast('Logging in...', 'info');
    await auth.signInWithEmailAndPassword(email, password);
    showToast('Welcome back! بِسْمِ اللَّهِ', 'success');
  } catch (err) {
    let msg = 'Login failed';
    if (err.code === 'auth/user-not-found') msg = 'No account found with this email';
    if (err.code === 'auth/wrong-password') msg = 'Incorrect password';
    if (err.code === 'auth/invalid-email') msg = 'Invalid email address';
    if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Try later.';
    showToast(msg, 'error');
  }
}

// ---- Register ----
async function registerUser() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!name || !email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  try {
    showToast('Creating account...', 'info');
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });

    // Save user data to Firebase
    await db.ref(`users/${cred.user.uid}/profile`).set({
      name,
      email,
      createdAt: Date.now(),
      plan: 'free',
      chatsCount: 0
    });

    showToast('Account created! Welcome to MI AI 🎉', 'success');
  } catch (err) {
    let msg = 'Registration failed';
    if (err.code === 'auth/email-already-in-use') msg = 'Email already registered';
    if (err.code === 'auth/weak-password') msg = 'Password is too weak';
    showToast(msg, 'error');
  }
}

// ---- Google Login ----
async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    // Save user if new
    await db.ref(`users/${result.user.uid}/profile`).once('value').then(async (snap) => {
      if (!snap.exists()) {
        await db.ref(`users/${result.user.uid}/profile`).set({
          name: result.user.displayName || 'User',
          email: result.user.email,
          createdAt: Date.now(),
          plan: 'free',
          chatsCount: 0
        });
      }
    });
    showToast('Welcome! بِسْمِ اللَّهِ', 'success');
  } catch (err) {
    showToast('Google login failed: ' + err.message, 'error');
  }
}

// ---- Logout ----
async function logoutUser() {
  try {
    await auth.signOut();
    showToast('Logged out successfully', 'info');
  } catch (err) {
    showToast('Logout failed', 'error');
  }
}

// ---- On Logged In ----
function onUserLoggedIn(user) {
  hideSplash();
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');

  // Update UI
  const displayName = user.displayName || user.email.split('@')[0];
  document.getElementById('user-display-name').textContent = displayName;
  document.getElementById('user-display-email').textContent = user.email;
  document.getElementById('user-avatar-display').textContent = displayName.charAt(0).toUpperCase();

  // Load chat history
  loadChatHistory();

  // Start new chat
  newChat();

  // Collect user data
  if (typeof collectUserData === 'function') collectUserData(user);
}

// ---- On Logged Out ----
function onUserLoggedOut() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
  currentUser = null;
  currentChatId = null;
}

// ---- Auth Tab Switch ----
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));

  document.querySelector(`[onclick="switchAuthTab('${tab}')"]`).classList.add('active');
  document.getElementById(`${tab}-form`).classList.remove('hidden');
}

// ============================================
// CHAT PERSISTENCE
// ============================================

// ---- Create New Chat ----
function newChat() {
  currentChatId = 'chat_' + Date.now();
  clearMessages();
  showWelcome();
  updateChatHistoryUI();
}

// ---- Save Message to Firebase ----
async function saveMessageToFirebase(message) {
  if (!currentUser || !currentChatId) return;

  try {
    const chatRef = db.ref(`users/${currentUser.uid}/chats/${currentChatId}`);

    // Set chat metadata on first message
    const meta = await chatRef.child('meta').once('value');
    if (!meta.exists()) {
      await chatRef.child('meta').set({
        title: message.content.substring(0, 50) + '...',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel || 'llama-3.3-70b-versatile',
        mode: currentMode || 'chat'
      });
    } else {
      await chatRef.child('meta/updatedAt').set(Date.now());
    }

    // Save message
    await chatRef.child('messages').push({
      role: message.role,
      content: message.content.substring(0, 5000), // Firebase limit safety
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Firebase save error:', err);
  }
}

// ---- Load Chat History ----
async function loadChatHistory() {
  if (!currentUser) return;

  try {
    const snap = await db.ref(`users/${currentUser.uid}/chats`).orderByChild('meta/updatedAt').limitToLast(30).once('value');
    const chats = snap.val() || {};
    allChats = chats;

    const list = document.getElementById('chat-history-list');
    list.innerHTML = '';

    // Sort by updatedAt descending
    const sorted = Object.entries(chats)
      .filter(([_, c]) => c.meta)
      .sort(([, a], [, b]) => (b.meta.updatedAt || 0) - (a.meta.updatedAt || 0));

    sorted.forEach(([chatId, chat]) => {
      const item = document.createElement('div');
      item.className = 'history-item' + (chatId === currentChatId ? ' active' : '');
      item.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="history-item-text">${chat.meta?.title || 'New Chat'}</span>
        <button class="history-delete" onclick="deleteChat('${chatId}', event)">✕</button>
      `;
      item.onclick = (e) => {
        if (e.target.classList.contains('history-delete')) return;
        loadChat(chatId);
      };
      list.appendChild(item);
    });
  } catch (err) {
    console.error('Load history error:', err);
  }
}

// ---- Load Specific Chat ----
async function loadChat(chatId) {
  if (!currentUser) return;

  try {
    currentChatId = chatId;
    const snap = await db.ref(`users/${currentUser.uid}/chats/${chatId}/messages`).once('value');
    const messages = snap.val() || {};

    clearMessages();
    hideWelcome();

    Object.values(messages).forEach(msg => {
      appendMessage(msg.role, msg.content, false);
    });

    updateChatHistoryUI();
  } catch (err) {
    console.error('Load chat error:', err);
  }
}

// ---- Delete Chat ----
async function deleteChat(chatId, event) {
  event.stopPropagation();
  if (!currentUser) return;

  try {
    await db.ref(`users/${currentUser.uid}/chats/${chatId}`).remove();
    if (chatId === currentChatId) newChat();
    loadChatHistory();
    showToast('Chat deleted', 'info');
  } catch (err) {
    console.error('Delete error:', err);
  }
}

// ---- Update History UI ----
function updateChatHistoryUI() {
  document.querySelectorAll('.history-item').forEach(item => {
    item.classList.remove('active');
  });
  loadChatHistory();
}

// ---- Export Chat ----
function exportChat() {
  const messages = Array.from(document.querySelectorAll('.message')).map(msg => {
    const role = msg.classList.contains('user') ? 'User' : 'MI AI';
    const content = msg.querySelector('.message-bubble')?.innerText || '';
    return `[${role}]\n${content}\n`;
  }).join('\n---\n\n');

  const blob = new Blob([`MI AI Chat Export\nDate: ${new Date().toLocaleString()}\nBy Muaaz Iqbal | Muslim Islam Org\n\n${'='.repeat(50)}\n\n${messages}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mi-ai-chat-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Chat exported!', 'success');
}

// ---- Save User Interaction to Firebase ----
async function saveInteraction(type, data) {
  if (!currentUser) return;
  try {
    await db.ref(`users/${currentUser.uid}/interactions`).push({
      type,
      data: JSON.stringify(data).substring(0, 1000),
      timestamp: Date.now()
    });
  } catch (e) {}
}
