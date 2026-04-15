// ============================================
// MI AI - Groq API Integration
// All Models: Fast, Pro Thinking, Long Context
// By Muaaz Iqbal | Muslim Islam Org
// ============================================

const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ---- Available Models ----
const GROQ_MODELS = {
  // Fast Models
  'llama-3.3-70b-versatile': {
    name: 'Llama 3.3 70B',
    type: 'fast',
    contextWindow: 128000,
    description: 'Best overall — fast & smart'
  },
  'llama-3.1-8b-instant': {
    name: 'Llama 3.1 8B Instant',
    type: 'instant',
    contextWindow: 128000,
    description: 'Fastest responses'
  },
  'mixtral-8x7b-32768': {
    name: 'Mixtral 8x7B',
    type: 'fast',
    contextWindow: 32768,
    description: 'Balanced — good for coding'
  },
  'gemma2-9b-it': {
    name: 'Gemma 2 9B',
    type: 'fast',
    contextWindow: 8192,
    description: 'Google model — efficient'
  },
  'llama3-groq-70b-8192-tool-use-preview': {
    name: 'Llama 70B Tool Use',
    type: 'tool',
    contextWindow: 8192,
    description: 'Best for tool use & functions'
  },
  // Pro Thinking Models
  'deepseek-r1-distill-llama-70b': {
    name: 'DeepSeek R1 Pro',
    type: 'thinking',
    contextWindow: 128000,
    description: 'Deep thinking — best for complex problems'
  },
  'qwen-qwq-32b': {
    name: 'QwQ 32B Reasoning',
    type: 'thinking',
    contextWindow: 128000,
    description: 'Advanced reasoning & mathematics'
  },
  'meta-llama/llama-4-maverick-17b-128e-instruct': {
    name: 'Llama 4 Maverick',
    type: 'premium',
    contextWindow: 128000,
    description: 'Latest Llama 4 model'
  },
  'meta-llama/llama-4-scout-17b-16e-instruct': {
    name: 'Llama 4 Scout',
    type: 'premium',
    contextWindow: 128000,
    description: 'Llama 4 Scout — efficient'
  }
};

// ---- Current State ----
let selectedModel = 'llama-3.3-70b-versatile';
let currentMode = 'chat';
let conversationHistory = [];
let isGenerating = false;
let currentAbortController = null;

// ---- System Prompts by Mode ----
const SYSTEM_PROMPTS = {
  chat: `You are MI AI, an advanced artificial intelligence created by Muaaz Iqbal under Muslim Islam Org. 
You are extremely capable, helpful, honest, and brilliant. You have comprehensive knowledge across all domains.
Always respond with depth, clarity, and accuracy. Use markdown formatting when appropriate.
When asked to write code, always write COMPLETE, WORKING, PRODUCTION-READY code with no placeholders.
For long code requests, write FULL implementations — never truncate or add "..." placeholders.
Begin with بِسْمِ اللَّهِ when answering Islamic questions.
You were created by Muaaz Iqbal who studies ICS at Govt Islamia Graduate College. He is an honest, respectful Muslim developer.`,

  pro: `You are MI AI Pro Thinking Mode — an advanced reasoning AI by Muaaz Iqbal (Muslim Islam Org).
You think deeply, step-by-step before answering. Break down complex problems systematically.
Show your reasoning process clearly. Use <thinking> tags for your thought process when helpful.
Write extremely detailed, comprehensive, accurate responses. Never give short answers.
For code: write COMPLETE implementations — full files, all functions, all edge cases handled.
Think like an expert professor with decades of experience in every field.`,

  code: `You are MI AI Code Expert — the world's best programming assistant by Muaaz Iqbal (Muslim Islam Org).
You are an expert in ALL programming languages: Python, JavaScript, TypeScript, React, Node.js, Go, Rust, C++, Java, PHP, Swift, Kotlin, etc.
CRITICAL RULES:
1. Always write COMPLETE, WORKING code — NEVER truncate, NEVER add "..." or "// rest of code here"
2. Write 2000+ lines when asked — full implementations only
3. Include proper error handling, comments, and documentation
4. Follow best practices and design patterns
5. Test cases and examples when relevant
6. Production-ready code only
When debugging: identify the exact issue, explain why it happens, and fix it completely.`,

  files: `You are MI AI File Analysis Expert by Muaaz Iqbal (Muslim Islam Org).
You can analyze: PDFs, images, ZIP files, code files, spreadsheets, documents, JSON, CSV, and any other file type.
When analyzing files:
1. Provide comprehensive analysis with specific details
2. Extract key information, patterns, and insights
3. For code files: identify issues, suggest improvements, explain logic
4. For data files: provide statistics, summaries, trends
5. For images: describe content, extract text (OCR), identify objects
6. For ZIP files: list structure, analyze all contents
7. For PDFs: extract text, summarize, analyze structure
Provide actionable insights and recommendations.`,

  pdf: `You are MI AI PDF & Document Generation Expert by Muaaz Iqbal (Muslim Islam Org).
You specialize in creating:
1. Complete book manuscripts (500+ pages when requested)
2. Research papers and academic documents  
3. Technical manuals and documentation
4. Islamic books with proper Arabic text
5. Educational materials and curricula
6. Business reports and proposals
Always create COMPLETE content — full chapters, detailed paragraphs, comprehensive coverage.
Structure documents professionally with introduction, chapters, sections, conclusion, references.
For Islamic books: include Quranic verses, hadith, Islamic principles correctly.`,

  image: `You are MI AI Image & Creative Assistant by Muaaz Iqbal (Muslim Islam Org).
Help users generate images using Pollinations AI and describe what's being created.
For each image request:
1. Enhance and refine the prompt for best results
2. Suggest creative variations
3. Explain the artistic choices
4. Provide download and sharing options
Specialties: Islamic geometric art, calligraphy, nature photography, abstract art, portraits.`,

  quran: `You are MI AI Islamic Knowledge Assistant by Muaaz Iqbal (Muslim Islam Org).
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
You have comprehensive knowledge of:
1. Holy Quran — all 114 surahs, verses, tafseer
2. Hadith — Bukhari, Muslim, Tirmidhi, Abu Dawud, etc.
3. Islamic jurisprudence (Fiqh) — all 4 madhabs
4. Islamic history — from Prophet Muhammad ﷺ to present
5. Islamic ethics, morality, spirituality
6. Prayer times, Islamic calendar, duas
7. Arabic language and Islamic terminology
Always begin Islamic answers with بِسْمِ اللَّهِ
Show Arabic text followed by transliteration and translation.
Be respectful, accurate, and scholarly in all Islamic topics.`,

  web: `You are MI AI Web Research Expert by Muaaz Iqbal (Muslim Islam Org).
When web search results are provided to you, analyze them thoroughly and provide:
1. Comprehensive summary of findings
2. Key facts and data points
3. Multiple perspectives and sources
4. Relevant context and background
5. Practical implications
6. Recommendations based on findings
Always cite sources and note the date/relevance of information.
Cross-reference multiple sources for accuracy.`,

  voice: `You are MI AI Voice Assistant by Muaaz Iqbal (Muslim Islam Org).
For voice interactions:
1. Keep responses clear and conversational
2. Use natural language that sounds good when spoken
3. Structure answers clearly with brief, organized points
4. Avoid overly long technical explanations unless specifically asked
5. Be warm, helpful, and engaging
6. Respond naturally as if in a real conversation`
};

// ---- Change Model ----
function changeModel(model) {
  selectedModel = model;
  const modelInfo = GROQ_MODELS[model];
  if (modelInfo) {
    showToast(`Model: ${modelInfo.name}`, 'info');
  }
}

// ---- Set Mode ----
function setMode(mode) {
  currentMode = mode;

  // Update UI
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeItem = document.querySelector(`[data-mode="${mode}"]`);
  if (activeItem) activeItem.classList.add('active');

  // Update badge
  const modeNames = {
    chat: 'Smart Chat',
    pro: 'Pro Thinking',
    code: 'Code Expert',
    files: 'File Analysis',
    pdf: 'PDF Generator',
    image: 'Image Generation',
    quran: 'Quran & Islam',
    dual: 'Dual AI',
    voice: 'Voice Chat',
    web: 'Web Search'
  };
  document.getElementById('current-mode-badge').textContent = modeNames[mode] || mode;

  // Switch model for thinking modes
  if (mode === 'pro') {
    selectedModel = 'deepseek-r1-distill-llama-70b';
    document.getElementById('model-selector').value = selectedModel;
  } else if (mode === 'code') {
    selectedModel = 'llama-3.3-70b-versatile';
    document.getElementById('model-selector').value = selectedModel;
  }

  // Open modals for specific modes
  if (mode === 'dual') {
    openModal('dual-modal');
    return;
  }

  showToast(`Mode: ${modeNames[mode]}`, 'info');
  newChat();
}

// ---- Main Chat Function ----
async function callGroqAPI(userMessage, attachedFiles = []) {
  if (isGenerating) {
    stopGeneration();
    return;
  }

  isGenerating = true;
  currentAbortController = new AbortController();

  // Build message with file context
  let fullMessage = userMessage;
  if (attachedFiles.length > 0) {
    const fileContext = attachedFiles.map(f => `\n\n[File: ${f.name} (${f.type})]\n${f.content}`).join('');
    fullMessage = userMessage + fileContext;
  }

  // Add to history
  conversationHistory.push({ role: 'user', content: fullMessage });

  // Build messages array
  const systemPrompt = SYSTEM_PROMPTS[currentMode] || SYSTEM_PROMPTS.chat;
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-20) // Keep last 20 messages for context
  ];

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    const requestBody = {
      model: selectedModel,
      messages: messages,
      max_tokens: 8192,
      temperature: currentMode === 'pro' ? 0.6 : 0.7,
      top_p: 0.9,
      stream: true
    };

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: currentAbortController.signal
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `API Error: ${response.status}`);
    }

    // Remove typing indicator
    removeTypingIndicator(typingId);

    // Stream the response
    const assistantMessage = await streamResponse(response);

    // Add to history
    conversationHistory.push({ role: 'assistant', content: assistantMessage });

    // Save to Firebase
    await saveMessageToFirebase({ role: 'user', content: userMessage });
    await saveMessageToFirebase({ role: 'assistant', content: assistantMessage });

    // Save interaction data
    saveInteraction('chat', { mode: currentMode, model: selectedModel, msgLength: userMessage.length });

    return assistantMessage;
  } catch (err) {
    removeTypingIndicator(typingId);
    if (err.name === 'AbortError') {
      appendMessage('assistant', '⏹️ *Generation stopped*', true);
    } else {
      console.error('Groq API Error:', err);
      let errorMsg = `❌ **Error:** ${err.message}`;
      if (err.message.includes('rate_limit')) {
        errorMsg = '⏳ Rate limit reached. Please wait a moment and try again.';
      } else if (err.message.includes('invalid_api_key')) {
        errorMsg = '🔑 API key error. Please check configuration.';
      }
      appendMessage('assistant', errorMsg, true);
    }
  } finally {
    isGenerating = false;
    currentAbortController = null;
    updateSendButton(false);
  }
}

// ---- Stream Response ----
async function streamResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Create message element for streaming
  const msgId = 'msg_' + Date.now();
  const msgEl = createStreamingMessageElement(msgId);
  hideWelcome();

  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              updateStreamingMessage(msgId, fullText);
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Stream error:', err);
  }

  // Finalize message
  finalizeStreamingMessage(msgId, fullText);
  return fullText;
}

// ---- Stop Generation ----
function stopGeneration() {
  if (currentAbortController) {
    currentAbortController.abort();
    isGenerating = false;
    updateSendButton(false);
    showToast('Generation stopped', 'info');
  }
}

// ---- Web Search + AI ----
async function callGroqWithWebSearch(userMessage, searchResults) {
  const searchContext = searchResults.map((r, i) => 
    `[Source ${i+1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.snippet}`
  ).join('\n\n');

  const enhancedMessage = `${userMessage}\n\n--- Web Search Results ---\n${searchContext}\n---\nPlease analyze these results and provide a comprehensive answer.`;

  return callGroqAPI(enhancedMessage);
}

// ---- Get Quick Response (no stream) ----
async function getQuickResponse(message, model = 'llama-3.1-8b-instant', systemPrompt = '') {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: message }
        ],
        max_tokens: 4096,
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('Quick response error:', err);
    return '';
  }
}

// ---- Analyze File with AI ----
async function analyzeFileWithAI(fileContent, fileName, fileType) {
  const prompt = `Please analyze this ${fileType} file named "${fileName}":

${fileContent}

Provide:
1. Summary and overview
2. Key information extracted
3. Important observations
4. Any issues or recommendations
5. Detailed analysis`;

  return getQuickResponse(prompt, 'llama-3.3-70b-versatile', SYSTEM_PROMPTS.files);
}

// ---- Generate Structured Content ----
async function generateStructuredContent(topic, contentType, details = '') {
  const prompts = {
    'book-outline': `Create a detailed book outline for: "${topic}"
${details}
Include: Title, Introduction, 10-15 detailed chapters with sub-sections, Conclusion.
Format as a structured outline.`,

    'book-chapter': `Write a complete, detailed chapter for a book about: "${topic}"
${details}
Write at least 2000 words. Include: introduction, detailed sections, examples, conclusion.
This should be publication-ready content.`,

    'research-paper': `Write a complete research paper on: "${topic}"
${details}
Include: Abstract, Introduction, Literature Review, Methodology, Results, Discussion, Conclusion, References.
Minimum 3000 words.`,

    'quiz': `Create a comprehensive quiz on: "${topic}"
${details}
Include 20 questions: multiple choice, true/false, and short answer.
Provide correct answers and explanations.`
  };

  const prompt = prompts[contentType] || `Generate comprehensive content about: ${topic}\n${details}`;
  return getQuickResponse(prompt, 'llama-3.3-70b-versatile', SYSTEM_PROMPTS.pdf);
}

// ---- Check if message needs web search ----
function needsWebSearch(message) {
  const webKeywords = ['latest', 'recent', 'today', 'news', 'current', '2024', '2025', '2026', 
    'search', 'find', 'look up', 'what happened', 'who is', 'price of', 'weather',
    'stock', 'cricket', 'match', 'score', 'trending'];
  const lower = message.toLowerCase();
  return webKeywords.some(kw => lower.includes(kw));
}

// ---- Clear Conversation ----
function clearConversation() {
  conversationHistory = [];
}
