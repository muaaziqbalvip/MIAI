# 🤖 MI AI — Advanced Intelligence Platform v2.0

**By Muaaz Iqbal | Muslim Islam Org**
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ

---

## ✨ What's New in v2.0

- **🔄 6 Groq API Keys Auto-Rotation** — Agar aik key rate limit ho jaye to automatically next key use karta hai
- **📱 Telegram Bot** — Full chatbot with /start, /help, /models commands
- **📄 Enhanced PDF Generator** — Better error handling, back cover, cleaner formatting
- **🛡️ Zero-downtime API** — Keys cycle automatically, no manual intervention needed
- **🐛 Better Error Messages** — User-friendly error reporting

---

## 🚀 Quick Deploy (Vercel — Frontend Only)

```bash
# 1. Clone/unzip project
# 2. Deploy to Vercel
vercel deploy
```

> Frontend works standalone with direct Groq API calls from browser.

---

## 🖥️ Full Stack Deploy (With Python Backend)

### Local Development
```bash
pip install -r requirements.txt
python ai.py
```

### Environment Variables (Vercel / Railway / Render)

| Variable | Value |
|---|---|
| `GROQ_API_KEY_1` | First Groq key |
| `GROQ_API_KEY_2` | Second Groq key |
| `GROQ_API_KEY_3` | Third Groq key |
| `GROQ_API_KEY_4` | Fourth Groq key |
| `GROQ_API_KEY_5` | Fifth Groq key |
| `GROQ_API_KEY_6` | Sixth Groq key |
| `TELEGRAM_TOKEN` | Bot token from @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | Your chat ID from @userinfobot |
| `PORT` | 5000 (default) |

---

## 📱 Telegram Bot Setup

1. Create bot via @BotFather → get `TELEGRAM_TOKEN`
2. Get your chat ID via @userinfobot → set `TELEGRAM_ADMIN_CHAT_ID`
3. Set webhook:
```bash
curl -X POST https://your-backend.com/api/telegram/set-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-backend.com/api/telegram/webhook"}'
```

---

## 🧠 Features

| Feature | Status |
|---|---|
| Multi-model AI Chat | ✅ |
| Code Generation & Review | ✅ |
| PDF Book Generation | ✅ |
| File Analysis | ✅ |
| Islamic Knowledge Mode | ✅ |
| Image Generation (Pollinations) | ✅ |
| Web Search | ✅ |
| Voice Chat | ✅ |
| Dual AI Mode | ✅ |
| Telegram Bot | ✅ |
| 6-Key API Rotation | ✅ |

---

## 📂 File Structure

```
MIAI/
├── index.html              # Main app (standalone)
├── ai.py                   # Python backend
├── requirements.txt        # Python dependencies
├── vercel.json             # Vercel config
├── .env.example            # Environment template
└── src/
    └── utils/
        ├── groq.js         # API + Key Rotation
        ├── pdfGenerator.js # PDF Engine
        ├── firebase.js     # Firebase Auth/DB
        ├── imageGenerator.js
        ├── zipGenerator.js
        ├── voiceHandler.js
        └── webSearch.js
```

---

*By Muaaz Iqbal — Govt. Islamia Graduate College (ICS) — Muslim Islam Org*
