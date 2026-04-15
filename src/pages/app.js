// ============================================
// MI AI - Main Application Logic
// Core chat, UI, message handling
// By Muaaz Iqbal | Muslim Islam Org
// ============================================

// ---- App State ----
let isSidebarOpen = true;
let isWelcomeVisible = true;

// ---- Initialize ----
document.addEventListener('DOMContentLoaded', () => {
  // Splash screen auto-hide after 2.5s (if not logged in)
  setTimeout(() => {
    if (!currentUser) {
      hideSplash();
      document.getElementById('auth-screen').classList.remove('hidden');
    }
  }, 2800);

  // Configure marked.js
  if (window.marked) {
    marked.setOptions({
      highlight: (code, lang) => {
        if (window.hljs && lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return window.hljs ? hljs.highlightAuto(code).value : code;
      },
      breaks: true,
      gfm: true
    });
  }
});

// ---- Hide Splash ----
function hideSplash() {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 700);
  }
}

// ---- Toggle Sidebar ----
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    isSidebarOpen = !isSidebarOpen;
    sidebar.classList.toggle('collapsed', !isSidebarOpen);
  }
}

// ---- Show/Hide Welcome ----
function showWelcome() {
  document.getElementById('welcome-screen').classList.remove('hidden');
  document.getElementById('messages-container').innerHTML = '';
  isWelcomeVisible = true;
}

function hideWelcome() {
  const welcome = document.getElementById('welcome-screen');
  if (welcome && !welcome.classList.contains('hidden')) {
    welcome.classList.add('hidden');
    isWelcomeVisible = false;
  }
}

// ---- Clear Messages ----
function clearMessages() {
  document.getElementById('messages-container').innerHTML = '';
  clearConversation();
}

// ---- Clear Chat ----
function clearChat() {
  if (confirm('Clear this chat?')) {
    clearMessages();
    showWelcome();
    showToast('Chat cleared', 'info');
  }
}

// ---- Send Suggestion ----
function sendSuggestion(text) {
  document.getElementById('message-input').value = text;
  sendMessage();
}

// ---- Handle Key Down ----
function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// ---- Auto Resize Textarea ----
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

// ---- Send Message ----
async function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();

  if (!message && uploadedFiles.length === 0) return;
  if (isGenerating) {
    stopGeneration();
    return;
  }

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  updateSendButton(true);

  // Hide welcome
  hideWelcome();

  // Track interaction
  trackInteraction('query', message);
  trackInteraction('mode', currentMode);
  trackInteraction('model', selectedModel);

  // Handle special modes
  if (currentMode === 'image' && !uploadedFiles.length) {
    appendMessage('user', message);
    await generateImageFromChat(message);
    updateSendButton(false);
    clearFiles();
    return;
  }

  if (currentMode === 'web' || needsWebSearch(message)) {
    appendMessage('user', message);
    await performWebSearch(message);
    updateSendButton(false);
    clearFiles();
    return;
  }

  // Append user message
  appendMessage('user', message, false, null, uploadedFiles);

  // Check for special commands
  if (message.toLowerCase().startsWith('/image ')) {
    const imgPrompt = message.slice(7);
    await generateImageFromChat(imgPrompt);
    updateSendButton(false);
    clearFiles();
    return;
  }

  if (message.toLowerCase().startsWith('/pdf ')) {
    const pdfTopic = message.slice(5);
    document.getElementById('pdf-topic').value = pdfTopic;
    openModal('pdf-modal');
    updateSendButton(false);
    clearFiles();
    return;
  }

  // Regular AI call
  await callGroqAPI(message, uploadedFiles);
  clearFiles();
}

// ---- Update Send Button ----
function updateSendButton(isLoading) {
  const btn = document.getElementById('send-btn');
  if (isLoading) {
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
    btn.title = 'Stop Generation';
  } else {
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    btn.title = 'Send';
  }
}

// ---- Append Message ----
function appendMessage(role, content, render = true, customHTML = null, files = []) {
  const container = document.getElementById('messages-container');
  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}`;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let avatarContent = role === 'user' 
    ? `<span>${currentUser?.displayName?.charAt(0) || 'U'}</span>`
    : `<img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI" />`;

  let bubbleContent = '';

  if (customHTML) {
    bubbleContent = customHTML;
  } else if (render && window.marked) {
    bubbleContent = marked.parse(content);
  } else {
    bubbleContent = escapeHTML(content).replace(/\n/g, '<br>');
  }

  // Add file attachments to user message
  let fileHTML = '';
  if (files && files.length > 0) {
    fileHTML = files.map(f => {
      if (f.category === 'image' && f.dataUrl) {
        return `<div class="file-attachment">
          <img src="${f.dataUrl}" alt="${f.name}" style="max-width:200px; border-radius:8px; display:block; margin-top:6px;" />
          <div><span>${f.name}</span><span style="color:var(--text-muted); font-size:0.75rem; margin-left:6px;">${formatFileSize(f.size)}</span></div>
        </div>`;
      }
      return `<div class="file-attachment">
        <span class="file-attachment-icon">${getFileIcon(f.category, f.ext)}</span>
        <div><span>${f.name}</span><span style="color:var(--text-muted); font-size:0.75rem; margin-left:6px;">${formatFileSize(f.size)}</span></div>
      </div>`;
    }).join('');
  }

  // Message actions
  const actionsHTML = role === 'assistant' ? `
    <div class="message-actions">
      <button class="msg-action-btn" onclick="copyMessage(this)" title="Copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="msg-action-btn" onclick="speakMessage(this)" title="Read aloud">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        Read
      </button>
      <button class="msg-action-btn" onclick="regenerateMessage(this)" title="Regenerate">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.35"/></svg>
        Retry
      </button>
    </div>
  ` : '';

  msgEl.innerHTML = `
    <div class="message-avatar">${avatarContent}</div>
    <div class="message-content">
      ${fileHTML}
      <div class="message-bubble">${bubbleContent}</div>
      <span class="message-time">${time}</span>
      ${actionsHTML}
    </div>
  `;

  // Add copy buttons to code blocks
  if (render) {
    setTimeout(() => {
      msgEl.querySelectorAll('pre code').forEach(block => {
        const pre = block.parentElement;
        pre.classList.add('code-block-wrapper');
        
        const langClass = block.className.match(/language-(\w+)/);
        const lang = langClass ? langClass[1] : 'code';

        const langBadge = document.createElement('span');
        langBadge.className = 'code-lang-badge';
        langBadge.textContent = lang;
        pre.appendChild(langBadge);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(block.innerText).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = 'Copy', 2000);
          });
        };
        pre.appendChild(copyBtn);

        // Apply highlight.js
        if (window.hljs) hljs.highlightElement(block);
      });
    }, 50);
  }

  container.appendChild(msgEl);
  scrollToBottom();

  return msgEl;
}

// ---- Create Streaming Message ----
function createStreamingMessageElement(id) {
  const container = document.getElementById('messages-container');
  const msgEl = document.createElement('div');
  msgEl.className = 'message assistant';
  msgEl.id = id;

  msgEl.innerHTML = `
    <div class="message-avatar"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI" /></div>
    <div class="message-content">
      <div class="message-bubble" id="${id}_content"><span class="typing-cursor">▋</span></div>
    </div>
  `;

  container.appendChild(msgEl);
  scrollToBottom();
  return msgEl;
}

// ---- Update Streaming Message ----
function updateStreamingMessage(id, content) {
  const el = document.getElementById(`${id}_content`);
  if (!el) return;

  if (window.marked) {
    el.innerHTML = marked.parse(content) + '<span class="typing-cursor" style="animation: blink 0.8s step-end infinite; color: var(--primary)">▋</span>';
  } else {
    el.innerHTML = escapeHTML(content).replace(/\n/g, '<br>') + '<span class="typing-cursor">▋</span>';
  }
  scrollToBottom();
}

// ---- Finalize Streaming Message ----
function finalizeStreamingMessage(id, content) {
  const el = document.getElementById(`${id}_content`);
  if (!el) return;

  if (window.marked) {
    el.innerHTML = marked.parse(content);
  } else {
    el.innerHTML = escapeHTML(content).replace(/\n/g, '<br>');
  }

  // Add code blocks and actions
  const msgEl = document.getElementById(id);
  if (msgEl) {
    // Add copy buttons
    msgEl.querySelectorAll('pre code').forEach(block => {
      const pre = block.parentElement;
      pre.classList.add('code-block-wrapper');
      
      const langClass = block.className.match(/language-(\w+)/);
      const lang = langClass ? langClass[1] : 'code';

      const langBadge = document.createElement('span');
      langBadge.className = 'code-lang-badge';
      langBadge.textContent = lang;
      pre.appendChild(langBadge);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-code-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(block.innerText).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => copyBtn.textContent = 'Copy', 2000);
        });
      };
      pre.appendChild(copyBtn);

      if (window.hljs) hljs.highlightElement(block);
    });

    // Add time and actions
    const contentDiv = msgEl.querySelector('.message-content');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    contentDiv.insertAdjacentHTML('beforeend', `
      <span class="message-time">${time}</span>
      <div class="message-actions">
        <button class="msg-action-btn" onclick="copyMessage(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <button class="msg-action-btn" onclick="speakMessage(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          Read
        </button>
        <button class="msg-action-btn" onclick="regenerateMessage(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.35"/></svg>
          Retry
        </button>
      </div>
    `);
  }

  scrollToBottom();
}

// ---- Show Typing Indicator ----
function showTypingIndicator() {
  const id = 'typing_' + Date.now();
  const container = document.getElementById('messages-container');
  const el = document.createElement('div');
  el.className = 'message assistant';
  el.id = id;
  el.innerHTML = `
    <div class="message-avatar"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI" /></div>
    <div class="message-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  container.appendChild(el);
  scrollToBottom();
  return id;
}

// ---- Remove Typing Indicator ----
function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ---- Message Actions ----
function copyMessage(btn) {
  const bubble = btn.closest('.message-content').querySelector('.message-bubble');
  const text = bubble?.innerText || '';
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied!', 'success');
  });
}

function speakMessage(btn) {
  const bubble = btn.closest('.message-content').querySelector('.message-bubble');
  const text = bubble?.innerText || '';
  speakText(text);
  showToast('Reading message aloud...', 'info');
}

async function regenerateMessage(btn) {
  // Get the last user message
  const messages = document.querySelectorAll('.message.user');
  const lastUserMsg = messages[messages.length - 1];
  const lastText = lastUserMsg?.querySelector('.message-bubble')?.innerText || '';

  if (lastText) {
    // Remove the last assistant message
    const assistantMessages = document.querySelectorAll('.message.assistant');
    assistantMessages[assistantMessages.length - 1]?.remove();

    conversationHistory.pop(); // Remove last assistant response

    showToast('Regenerating...', 'info');
    await callGroqAPI(lastText);
  }
}

// ---- Scroll to Bottom ----
function scrollToBottom() {
  const chatArea = document.getElementById('chat-area');
  chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

// ---- Modal Functions ----
function openModal(modalId) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => {
    m.classList.remove('show');
    setTimeout(() => m.classList.add('hidden'), 200);
  });
}

// ---- Toast Notifications ----
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---- Escape HTML ----
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---- Utility: Stub functions for unused files ----
// These are in separate files but declared here as stubs to prevent errors
function voiceHandler() {}
function webSearchHandler() {}
function dualAIHandler() {}
function dataCollectorHandler() {}

// Add CSS for blink animation
const style = document.createElement('style');
style.textContent = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;
document.head.appendChild(style);

// Close sidebar on mobile when clicking outside
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (sidebar.classList.contains('mobile-open') && 
        !sidebar.contains(e.target) && 
        !menuBtn.contains(e.target)) {
      sidebar.classList.remove('mobile-open');
    }
  }
});
