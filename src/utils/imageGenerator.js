// ============================================
// MI AI - Image Generator
// Uses Pollinations AI (Free) for image generation
// By Muaaz Iqbal | Muslim Islam Org
// ============================================

let selectedImageSize = '512x512';

// ---- Open Image Modal ----
function generateImage() {
  openModal('image-modal');
}

// ---- Set Image Size ----
function setImageSize(btn, size) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedImageSize = size;
}

// ---- Execute Image Generation ----
async function executeImageGeneration() {
  const prompt = document.getElementById('image-prompt').value.trim();
  const style = document.getElementById('image-style').value;

  if (!prompt) {
    showToast('Please describe the image', 'error');
    return;
  }

  closeModal();
  hideWelcome();

  const [width, height] = selectedImageSize.split('x').map(Number);

  // Enhance prompt based on style
  const styleEnhancements = {
    'realistic': 'photorealistic, 8k, highly detailed, professional photography',
    'anime': 'anime style, manga art, vibrant colors, detailed linework',
    'artistic': 'oil painting, artistic masterpiece, museum quality, rich textures',
    'abstract': 'abstract art, geometric shapes, colorful, modern art',
    'islamic': 'Islamic geometric art, arabesque pattern, calligraphy, mosque architecture, golden details',
    'nature': 'nature photography, national geographic, stunning landscape, golden hour'
  };

  const enhancement = styleEnhancements[style] || '';
  const enhancedPrompt = `${prompt}, ${enhancement}`;

  // Show in chat
  const msgId = 'img_msg_' + Date.now();
  const thinkingEl = appendThinkingMessage('🎨 Generating image with Pollinations AI...');

  try {
    // Pollinations AI (completely free)
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 99999);

    // Multiple Pollinations endpoints for reliability
    const imageUrls = [
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`,
      `https://pollinations.ai/p/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}`
    ];

    const imageUrl = imageUrls[0];

    removeThinkingMessage(thinkingEl);

    // Add image message
    const imgMsg = `
      <div class="image-generation-result">
        <p>🎨 <strong>Generated Image</strong> — Prompt: "${prompt}"</p>
        <p style="font-size:0.82rem; color: var(--text-muted)">Style: ${style} | Size: ${selectedImageSize}</p>
        <img 
          src="${imageUrl}" 
          alt="${prompt}" 
          class="chat-image generated-image"
          style="max-width: 100%; border-radius: 12px; margin-top: 10px;"
          onload="this.style.opacity='1'"
          onerror="this.onerror=null; handleImageError(this, '${encodedPrompt}', ${width}, ${height})"
          style="opacity: 0; transition: opacity 0.5s ease;"
          loading="lazy"
        />
        <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
          <a href="${imageUrl}" download="MI-AI-image-${Date.now()}.png" class="download-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
          <button class="download-btn" onclick="regenerateImage('${encodeURIComponent(prompt)}', '${style}', ${width}, ${height})" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark))">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.35"/></svg>
            Regenerate
          </button>
          <button class="download-btn" onclick="generateVariations('${encodeURIComponent(prompt)}', '${style}', ${width}, ${height})" style="background: linear-gradient(135deg, var(--secondary), #008866)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            4 Variations
          </button>
        </div>
      </div>
    `;

    appendMessage('assistant', '', true, imgMsg);
    showToast('Image generated!', 'success');

  } catch (err) {
    removeThinkingMessage(thinkingEl);
    appendMessage('assistant', `❌ Image generation failed: ${err.message}`, true);
  }
}

// ---- Handle Image Error ----
function handleImageError(img, encodedPrompt, width, height) {
  const seed2 = Math.floor(Math.random() * 99999);
  img.src = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed2}&nologo=true&enhance=true`;
}

// ---- Regenerate Image ----
function regenerateImage(encodedPrompt, style, width, height) {
  const seed = Math.floor(Math.random() * 99999);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  const imgHtml = `
    <div class="image-generation-result">
      <p>🔄 <strong>Regenerated Image</strong></p>
      <img src="${imageUrl}" alt="Regenerated" class="chat-image" style="max-width: 100%; border-radius: 12px; margin-top: 10px;" />
      <div style="margin-top: 10px;">
        <a href="${imageUrl}" download="MI-AI-regen-${Date.now()}.png" class="download-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </a>
      </div>
    </div>
  `;
  appendMessage('assistant', '', true, imgHtml);
  showToast('New variation generated!', 'success');
}

// ---- Generate 4 Variations ----
async function generateVariations(encodedPrompt, style, width, height) {
  const thinkEl = appendThinkingMessage('🎨 Generating 4 variations...');

  const variations = [];
  for (let i = 0; i < 4; i++) {
    const seed = Math.floor(Math.random() * 99999);
    variations.push(`https://image.pollinations.ai/prompt/${encodedPrompt}?width=${Math.floor(width/2)}&height=${Math.floor(height/2)}&seed=${seed}&nologo=true`);
  }

  removeThinkingMessage(thinkEl);

  const gridHtml = `
    <div>
      <p>🎨 <strong>4 Variations</strong></p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
        ${variations.map((url, i) => `
          <div>
            <img src="${url}" alt="Variation ${i+1}" style="width:100%; border-radius: 8px;" />
            <a href="${url}" download="MI-AI-var${i+1}-${Date.now()}.png" style="display:block; text-align:center; font-size:0.78rem; color:var(--secondary); margin-top:4px;">Download V${i+1}</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  appendMessage('assistant', '', true, gridHtml);
}

// ---- Generate Image from Text Prompt in Chat ----
async function generateImageFromChat(prompt) {
  const thinkEl = appendThinkingMessage('🎨 Generating image...');

  const seed = Math.floor(Math.random() * 99999);
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${seed}&nologo=true`;

  removeThinkingMessage(thinkEl);

  const imgHtml = `
    <div>
      <p>🎨 <strong>Generated Image</strong></p>
      <img src="${imageUrl}" alt="${prompt}" class="chat-image" style="max-width: 100%; border-radius: 12px; margin-top: 8px;" />
      <a href="${imageUrl}" download="MI-AI-${Date.now()}.png" class="download-btn" style="margin-top:8px; display:inline-flex;">
        Download
      </a>
    </div>
  `;
  appendMessage('assistant', '', true, imgHtml);
}

// ---- Thinking Message Helpers ----
function appendThinkingMessage(text) {
  const id = 'thinking_' + Date.now();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'message assistant';
  el.innerHTML = `
    <div class="message-avatar"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI" /></div>
    <div class="message-content">
      <div class="thinking-indicator">
        <div class="thinking-spinner"></div>
        <span>${text}</span>
      </div>
    </div>
  `;
  document.getElementById('messages-container').appendChild(el);
  scrollToBottom();
  return id;
}

function removeThinkingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
