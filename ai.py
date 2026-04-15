#!/usr/bin/env python3
"""
MI AI - Complete Python Backend
By Muaaz Iqbal | Muslim Islam Org
Powered by Groq API
"""

import os
import json
import time
import base64
import zipfile
import tempfile
import requests
import io
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_file, Response, stream_with_context
from flask_cors import CORS
from groq import Groq

# ─────────────────────────────────────────
# INIT
# ─────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins="*")

GROQ_KEY = os.getenv("GROQ_API_KEY", "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")
client = Groq(api_key=GROQ_KEY)

UPLOAD_DIR = Path(tempfile.gettempdir()) / "mi_ai_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────
# GROQ MODELS (Latest 2025)
# ─────────────────────────────────────────
MODELS = {
    "llama-3.3-70b-versatile":    {"name": "Llama 3.3 70B",         "type": "fast",     "ctx": 128000},
    "llama-3.1-8b-instant":        {"name": "Llama 3.1 8B Instant",   "type": "instant",  "ctx": 128000},
    "mixtral-8x7b-32768":          {"name": "Mixtral 8x7B",           "type": "balanced", "ctx": 32768},
    "gemma2-9b-it":                {"name": "Gemma 2 9B",             "type": "smart",    "ctx": 8192},
    "deepseek-r1-distill-llama-70b":{"name":"DeepSeek R1 Pro",        "type": "thinking", "ctx": 128000},
    "deepseek-r1-distill-qwen-32b":{"name": "DeepSeek R1 Qwen",      "type": "thinking", "ctx": 128000},
    "qwen-qwq-32b":                {"name": "QwQ 32B Reasoning",      "type": "thinking", "ctx": 128000},
    "meta-llama/llama-4-maverick-17b-128e-instruct": {"name":"Llama 4 Maverick","type":"latest","ctx":128000},
    "meta-llama/llama-4-scout-17b-16e-instruct":     {"name":"Llama 4 Scout",   "type":"latest","ctx":128000},
    "compound-beta":               {"name": "Compound Beta",          "type": "multi",    "ctx": 128000},
    "compound-beta-mini":          {"name": "Compound Beta Mini",     "type": "multi",    "ctx": 128000},
    "llama3-groq-70b-8192-tool-use-preview": {"name":"Llama 70B Tools","type":"tool","ctx":8192},
}

# ─────────────────────────────────────────
# SYSTEM PROMPTS
# ─────────────────────────────────────────
SYSTEMS = {
    "chat": """You are MI AI — Advanced Intelligence by Muaaz Iqbal (Muslim Islam Org).
Brilliant, helpful, comprehensive. Use rich markdown. Write COMPLETE answers, never truncate.
For code: full working implementation always — 2000-5000+ lines when asked. No shortcuts.
Begin Islamic answers with بِسْمِ اللَّهِ""",

    "pro": """You are MI AI Pro Thinking Mode by Muaaz Iqbal (Muslim Islam Org).
Think deeply step-by-step. Show reasoning process. Extremely detailed answers.
Code: COMPLETE full implementations — all functions, all edge cases, all error handling.""",

    "code": """You are MI AI Code Expert by Muaaz Iqbal (Muslim Islam Org) — world's best programmer.
ALWAYS write COMPLETE working code. NEVER use '...' or truncate. Write 2000-5000+ lines when asked.
Include: full error handling, comprehensive comments, tests, documentation.
Expert in: Python, JS, TS, React, Node, Go, Rust, C++, Java, PHP, Flutter, SQL, etc.""",

    "files": """You are MI AI File Analysis Expert by Muaaz Iqbal (Muslim Islam Org).
Analyze: PDFs, images, ZIPs, code, CSV, JSON, Excel, Word, M3U, any format.
Provide: comprehensive analysis, key insights, patterns, recommendations, statistics.""",

    "pdf": """You are MI AI Book & PDF Generator by Muaaz Iqbal (Muslim Islam Org).
Create complete books — full chapters, detailed paragraphs, 500+ pages when asked.
Professional: intro, chapters, sub-sections, conclusion, references.
Islamic books: include Quran verses, hadith, proper Arabic.""",

    "quran": """You are MI AI Islamic Knowledge by Muaaz Iqbal (Muslim Islam Org).
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
Expert: Quran (114 surahs, full tafseer), Hadith (Bukhari, Muslim, Tirmidhi etc),
Fiqh (all 4 madhabs), Islamic history, duas, prayer, Arabic.
Format: Arabic text → transliteration → translation → explanation.""",

    "web": """You are MI AI Web Research Expert by Muaaz Iqbal (Muslim Islam Org).
Give comprehensive info on any topic. Cite sources. Multiple perspectives. Latest known info.""",
}

# ─────────────────────────────────────────
# HELPER: Call Groq
# ─────────────────────────────────────────
def groq_call(messages, model="llama-3.3-70b-versatile", max_tokens=8192, temperature=0.7):
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return resp.choices[0].message.content or ""
    except Exception as e:
        return f"Error: {str(e)}"

def groq_stream(messages, model="llama-3.3-70b-versatile", max_tokens=8192, temperature=0.7):
    try:
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield delta
    except Exception as e:
        yield f"Error: {str(e)}"

# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────

@app.route("/")
def root():
    return jsonify({"status": "MI AI Backend Running", "version": "3.0", "by": "Muaaz Iqbal | Muslim Islam Org"})

@app.route("/api/models")
def get_models():
    return jsonify({"models": MODELS})

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json or {}
    user_msg    = data.get("message", "")
    mode        = data.get("mode", "chat")
    model       = data.get("model", "llama-3.3-70b-versatile")
    history     = data.get("history", [])
    stream_mode = data.get("stream", False)

    sys_prompt = SYSTEMS.get(mode, SYSTEMS["chat"])
    messages = [{"role": "system", "content": sys_prompt}]
    messages += history[-16:]
    messages.append({"role": "user", "content": user_msg})

    if stream_mode:
        def generate():
            for chunk in groq_stream(messages, model):
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(generate()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    reply = groq_call(messages, model)
    return jsonify({"reply": reply, "model": model, "mode": mode})

@app.route("/api/analyze-file", methods=["POST"])
def analyze_file():
    """Analyze uploaded files: PDF, images, ZIP, CSV, JSON, code, etc."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    fname = f.filename or "file"
    ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else "bin"
    model = request.form.get("model", "llama-3.3-70b-versatile")

    content = ""
    analysis_type = "general"

    try:
        raw = f.read()

        # TEXT-BASED FILES
        if ext in ["txt", "md", "log", "yaml", "yml", "toml", "ini", "cfg", "conf", "html", "xml", "csv", "tsv", "json", "jsonl", "js", "ts", "py", "php", "java", "cpp", "c", "cs", "go", "rs", "rb", "swift", "kt", "dart", "sql", "sh", "bash", "jsx", "tsx", "vue", "r", "scala", "lua", "m3u", "m3u8"]:
            try:
                content = raw.decode("utf-8", errors="replace")
                analysis_type = "code" if ext in ["js","ts","py","php","java","cpp","c","cs","go","rs","rb","swift","kt","dart","sql","sh","bash","jsx","tsx","vue","r","scala","lua"] else "text"
            except:
                content = "[Binary content — cannot decode as text]"

        # ZIP FILES
        elif ext == "zip":
            analysis_type = "zip"
            try:
                with zipfile.ZipFile(io.BytesIO(raw)) as z:
                    names = z.namelist()
                    content = f"ZIP Archive: {fname}\nTotal files: {len(names)}\n\nContents:\n"
                    for n in names[:50]:
                        content += f"  {'[DIR]' if n.endswith('/') else '[FILE]'} {n}\n"
                    content += "\n--- File previews ---\n"
                    text_exts = {"py","js","ts","html","css","txt","md","json","yaml","yml","sh","php","java","cpp","c","go","rs","sql"}
                    count = 0
                    for n in names:
                        if count >= 8: break
                        nx = n.rsplit(".", 1)[-1].lower() if "." in n else ""
                        if nx in text_exts and not n.endswith("/"):
                            try:
                                fc = z.read(n).decode("utf-8", errors="replace")
                                content += f"\n=== {n} ({len(fc.splitlines())} lines) ===\n{fc[:2000]}\n"
                                count += 1
                            except: pass
            except Exception as e:
                content = f"ZIP read error: {e}"

        # PDF
        elif ext == "pdf":
            analysis_type = "pdf"
            content = f"PDF File: {fname}\nSize: {len(raw):,} bytes\n[PDF text extraction available — analyzing metadata and structure]"
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(raw))
                pages_text = []
                for i, page in enumerate(reader.pages[:20]):
                    pt = page.extract_text() or ""
                    if pt.strip():
                        pages_text.append(f"--- Page {i+1} ---\n{pt[:1500]}")
                content = f"PDF: {fname}\nPages: {len(reader.pages)}\n\n" + "\n".join(pages_text)
            except ImportError:
                content += "\n[Install pypdf for full text extraction]"
            except Exception as e:
                content += f"\n[PDF parse error: {e}]"

        # IMAGES
        elif ext in ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"]:
            analysis_type = "image"
            b64 = base64.b64encode(raw).decode()
            content = f"Image: {fname} ({len(raw):,} bytes, type: {ext.upper()})"
            # Vision analysis via groq if supported
            try:
                vision_resp = client.chat.completions.create(
                    model="meta-llama/llama-4-maverick-17b-128e-instruct",
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/{ext};base64,{b64}"}},
                            {"type": "text", "text": "Describe this image in detail. Extract any text (OCR). Identify objects, colors, composition, and any important information."}
                        ]
                    }],
                    max_tokens=2048
                )
                content = vision_resp.choices[0].message.content or content
            except Exception as ve:
                content += f"\n[Vision analysis: {ve}]"
            return jsonify({"analysis": content, "type": analysis_type, "filename": fname})

        # EXCEL/SPREADSHEET
        elif ext in ["xlsx", "xls"]:
            analysis_type = "spreadsheet"
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(raw), data_only=True)
                content = f"Excel: {fname}\nSheets: {', '.join(wb.sheetnames)}\n\n"
                for sname in wb.sheetnames[:3]:
                    ws = wb[sname]
                    content += f"=== {sname} ({ws.max_row} rows x {ws.max_column} cols) ===\n"
                    for row in list(ws.iter_rows(values_only=True))[:30]:
                        content += "\t".join([str(v or "") for v in row]) + "\n"
                    content += "\n"
            except ImportError:
                content = f"Excel: {fname} — install openpyxl for analysis"
            except Exception as e:
                content = f"Excel error: {e}"

        # WORD DOCUMENTS
        elif ext in ["docx", "doc"]:
            analysis_type = "document"
            try:
                import docx
                doc = docx.Document(io.BytesIO(raw))
                paras = [p.text for p in doc.paragraphs if p.text.strip()]
                content = f"Word Document: {fname}\nParagraphs: {len(paras)}\n\n" + "\n".join(paras[:100])
            except ImportError:
                content = f"Word Doc: {fname} — install python-docx for analysis"
            except Exception as e:
                content = f"DOCX error: {e}"

        # BINARY FALLBACK
        else:
            content = f"Binary file: {fname} ({len(raw):,} bytes, type: .{ext})"

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Now analyze with AI
    if len(content) > 12000:
        content = content[:12000] + "\n... [truncated for analysis]"

    prompt = f"""Analyze this {analysis_type} file named "{fname}":

{content}

Provide:
1. **Summary** — what this file contains
2. **Key Information** — important data, functions, or content extracted
3. **Statistics** — size, lines, structure
4. **Issues / Observations** — any problems, patterns, or notable items
5. **Recommendations** — how to improve or use this content

Be comprehensive and specific."""

    analysis = groq_call([{"role": "system", "content": SYSTEMS["files"]}, {"role": "user", "content": prompt}], model)
    return jsonify({"analysis": analysis, "raw_content": content[:3000], "type": analysis_type, "filename": fname})

@app.route("/api/generate-pdf", methods=["POST"])
def generate_pdf():
    """Generate a complete PDF book with chapters."""
    data = request.json or {}
    topic   = data.get("topic", "AI")
    pages   = int(data.get("pages", 50))
    btype   = data.get("type", "educational")
    details = data.get("details", "")
    model   = data.get("model", "llama-3.3-70b-versatile")
    chapters_req = min(max(5, pages // 10), 12)

    results = {"topic": topic, "type": btype, "chapters": []}

    # Generate outline
    outline = groq_call([
        {"role": "system", "content": SYSTEMS["pdf"]},
        {"role": "user", "content": f"Create detailed book outline for: '{topic}'. Include 10-15 chapters with sub-sections. {details}"}
    ], model)
    results["outline"] = outline

    # Generate chapters
    for i in range(1, chapters_req + 1):
        chapter = groq_call([
            {"role": "system", "content": SYSTEMS["pdf"]},
            {"role": "user", "content": f"""Write Chapter {i} of {chapters_req} for a {btype} book about "{topic}".
Outline reference: {outline[:400]}
{details}
Write detailed, comprehensive content — minimum 1000 words.
{"Include relevant Quranic verses and hadith. Begin with بِسْمِ اللَّهِ" if btype == "islamic" else ""}
Include: introduction, detailed sections with examples, conclusion."""}
        ], model, max_tokens=4096)
        results["chapters"].append({"number": i, "content": chapter})

    return jsonify(results)

@app.route("/api/generate-zip", methods=["POST"])
def generate_zip_api():
    """Generate a complete project as ZIP."""
    data = request.json or {}
    description = data.get("description", "")
    proj_type   = data.get("type", "web")
    model       = data.get("model", "llama-3.3-70b-versatile")

    type_hints = {
        "web":       "Complete web app: index.html (2500+ lines with full JS app inside), styles.css (1200+ lines), README.md",
        "react":     "React: src/App.jsx (2000+ lines), src/components/Header.jsx, src/components/Main.jsx, src/components/Footer.jsx, src/styles/App.css (800+ lines), package.json, README.md",
        "python":    "Python: main.py (2500+ lines), utils.py (1000+ lines), models.py (800+ lines), requirements.txt, README.md",
        "nodejs":    "Node.js: src/server.js (2000+ lines), src/routes/api.js (800+ lines), src/middleware/auth.js, src/models/user.js, package.json, .env.example, README.md",
        "fullstack": "Full-stack: frontend/index.html (1500+ lines), frontend/js/app.js (2000+ lines), frontend/css/style.css (1000+ lines), backend/server.js (2000+ lines), backend/routes/api.js, package.json, README.md",
        "django":    "Django: manage.py, app/views.py (1500+ lines), app/models.py (800+ lines), app/urls.py, app/serializers.py, requirements.txt, README.md",
        "flutter":   "Flutter: lib/main.dart (2000+ lines), lib/screens/home.dart (800+ lines), lib/widgets/custom.dart, pubspec.yaml, README.md",
        "custom":    "Generate complete files as described",
    }

    resp = groq_call([
        {"role": "system", "content": SYSTEMS["code"]},
        {"role": "user", "content": f"""Create complete {proj_type} project: "{description}"

Requirements: {type_hints.get(proj_type, type_hints["custom"])}

CRITICAL:
- Write COMPLETE working code — NO placeholders, NO shortcuts, NO "..."
- Minimum 3000 total lines across all files
- Include comprehensive error handling and comments
- Production-ready, fully functional code

Return ONLY valid JSON (no markdown fences):
{{"projectName":"folder-name","files":[{{"path":"relative/path.ext","content":"FULL content here"}}]}}"""}
    ], model, max_tokens=8192)

    try:
        m = __import__("re").search(r"\{[\s\S]*\}", resp)
        proj = json.loads(m.group()) if m else None
    except:
        proj = None

    if not proj or not proj.get("files"):
        proj = {"projectName": "mi-ai-project", "files": [{"path": "main.py", "content": resp}]}

    # Build ZIP in memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        folder = proj.get("projectName", "mi-ai-project")
        for f in proj["files"]:
            z.writestr(f"{folder}/{f['path']}", f.get("content", ""))
        z.writestr(f"{folder}/MI-AI-INFO.md",
            f"# Generated by MI AI\nBy: Muaaz Iqbal | Muslim Islam Org\nDate: {datetime.now()}\nProject: {description}\n\nبِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
    buf.seek(0)

    fname = f"MI-AI-{proj.get('projectName','project')}-{int(time.time())}.zip"
    return send_file(buf, mimetype="application/zip", as_attachment=True, download_name=fname)

@app.route("/api/generate-image", methods=["POST"])
def generate_image_api():
    """Generate image prompt enhancement and return Pollinations URL."""
    data = request.json or {}
    prompt = data.get("prompt", "")
    style  = data.get("style", "photorealistic")
    width  = int(data.get("width", 1024))
    height = int(data.get("height", 1024))
    model  = data.get("model", "llama-3.3-70b-versatile")

    # AI-enhanced prompt
    enhanced = groq_call([
        {"role": "user", "content": f"Enhance this image generation prompt to be more detailed and visually rich. Return ONLY the enhanced prompt, nothing else:\n{prompt}, {style}"}
    ], "llama-3.1-8b-instant", max_tokens=300)

    import random, urllib.parse
    seed = random.randint(1, 999999)
    enc = urllib.parse.quote(enhanced or prompt)
    url = f"https://image.pollinations.ai/prompt/{enc}?width={width}&height={height}&seed={seed}&nologo=true&enhance=true"

    return jsonify({"url": url, "enhanced_prompt": enhanced, "seed": seed, "width": width, "height": height})

@app.route("/api/web-search", methods=["POST"])
def web_search_api():
    """AI-powered web research."""
    data = request.json or {}
    query = data.get("query", "")
    model = data.get("model", "llama-3.3-70b-versatile")

    # Try DuckDuckGo instant answers
    ddg_result = ""
    try:
        r = requests.get(f"https://api.duckduckgo.com/?q={query}&format=json&no_html=1&skip_disambig=1", timeout=5)
        if r.ok:
            d = r.json()
            if d.get("Abstract"):
                ddg_result = f"Quick Answer: {d['Abstract']}\nSource: {d.get('AbstractSource','')}\n"
            if d.get("RelatedTopics"):
                ddg_result += "Related:\n" + "\n".join([t.get("Text","") for t in d["RelatedTopics"][:5] if isinstance(t,dict)])
    except:
        pass

    resp = groq_call([
        {"role": "system", "content": SYSTEMS["web"]},
        {"role": "user", "content": f"""Research query: "{query}"
{f'DDG data: {ddg_result}' if ddg_result else ''}

Provide comprehensive answer with: key facts, context, multiple perspectives, latest known info, recommendations."""}
    ], model, max_tokens=4096)

    return jsonify({
        "result": resp,
        "query": query,
        "links": {
            "google": f"https://www.google.com/search?q={query}",
            "brave":  f"https://search.brave.com/search?q={query}",
            "ddg":    f"https://duckduckgo.com/?q={query}"
        }
    })

@app.route("/api/generate-spreadsheet", methods=["POST"])
def generate_spreadsheet():
    """Generate CSV/Excel spreadsheet."""
    data = request.json or {}
    topic = data.get("topic", "")
    model = data.get("model", "llama-3.3-70b-versatile")

    csv_content = groq_call([
        {"role": "system", "content": "You are a data expert. Generate comprehensive CSV data with headers."},
        {"role": "user", "content": f"Create a comprehensive spreadsheet/table for: {topic}\nReturn ONLY CSV format with headers in first row. Include at least 30 rows of data."}
    ], model)

    buf = io.BytesIO()
    buf.write(csv_content.encode("utf-8"))
    buf.seek(0)
    fname = f"MI-AI-{topic[:20].replace(' ','_')}-{int(time.time())}.csv"
    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name=fname)

@app.route("/api/generate-doc", methods=["POST"])
def generate_doc():
    """Generate Word-compatible HTML document."""
    data = request.json or {}
    topic   = data.get("topic", "")
    content = data.get("content", "")
    model   = data.get("model", "llama-3.3-70b-versatile")

    if not content:
        content = groq_call([
            {"role": "system", "content": SYSTEMS["pdf"]},
            {"role": "user", "content": f"Write a comprehensive professional document about: {topic}\nInclude headings, paragraphs, lists. Minimum 2000 words."}
        ], model, max_tokens=4096)

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<title>{topic}</title>
<style>body{{font-family:Calibri,sans-serif;margin:3cm;color:#222;line-height:1.6}}
h1{{color:#1a3a5c;border-bottom:2px solid #1a3a5c;font-size:24pt}}
h2{{color:#234e6e;font-size:16pt;margin-top:20pt}}
h3{{color:#2d6892;font-size:13pt}}
p{{font-size:12pt;text-align:justify}}
.footer{{text-align:center;color:#888;font-size:9pt;margin-top:40pt;border-top:1px solid #ccc;padding-top:8pt}}
</style></head><body>
<h1>{topic}</h1>
<div>{_md_to_html(content)}</div>
<div class="footer">Generated by MI AI | Muaaz Iqbal | Muslim Islam Org | {datetime.now().strftime('%Y-%m-%d')}</div>
</body></html>"""

    buf = io.BytesIO(html.encode("utf-8"))
    fname = f"MI-AI-{topic[:20].replace(' ','_')}-{int(time.time())}.doc"
    return send_file(buf, mimetype="application/msword", as_attachment=True, download_name=fname)

@app.route("/api/dual-ai", methods=["POST"])
def dual_ai():
    """Run a dual AI debate."""
    data   = request.json or {}
    topic  = data.get("topic", "")
    m1     = data.get("model1", "deepseek-r1-distill-llama-70b")
    m2     = data.get("model2", "mixtral-8x7b-32768")
    rounds = int(data.get("rounds", 3))

    debate = []
    h1, h2 = [], []

    for r in range(1, rounds + 1):
        # AI Alpha
        ap = f'Debate topic: "{topic}". {"Present opening argument." if r==1 else f"Counter: {h2[-1] if h2 else ""}"}'
        a_resp = groq_call([{"role":"system","content":"You are a brilliant debater. Be comprehensive and use evidence."},{"role":"user","content":ap}], m1, max_tokens=1024)
        h1.append(a_resp)
        debate.append({"round": r, "ai": "alpha", "model": m1, "content": a_resp})

        # AI Beta
        bp = f'Debate "{topic}". Alpha said: "{a_resp[:300]}". Counter-argue with different perspective.'
        b_resp = groq_call([{"role":"system","content":"You are a brilliant debater. Challenge arguments intelligently."},{"role":"user","content":bp}], m2, max_tokens=1024)
        h2.append(b_resp)
        debate.append({"round": r, "ai": "beta", "model": m2, "content": b_resp})

    # Synthesis
    synthesis = groq_call([{"role":"user","content":f'Synthesize this debate about "{topic}". Fair balanced conclusion.'}], "llama-3.3-70b-versatile", max_tokens=1024)
    return jsonify({"debate": debate, "synthesis": synthesis, "topic": topic})

@app.route("/api/quiz", methods=["POST"])
def generate_quiz():
    """Generate quiz/test."""
    data   = request.json or {}
    topic  = data.get("topic", "")
    num    = int(data.get("questions", 20))
    level  = data.get("level", "medium")
    model  = data.get("model", "llama-3.3-70b-versatile")

    resp = groq_call([
        {"role":"system","content":"You are an expert educator. Create comprehensive quizzes."},
        {"role":"user","content":f"""Create a {level} difficulty quiz about "{topic}" with {num} questions.
Mix: multiple choice (A/B/C/D), true/false, and short answer.
Format each question clearly with ANSWER key at the end.
JSON format: {{"quiz":[{{"q":"question","type":"mcq/tf/short","options":["A","B","C","D"],"answer":"correct"}}]}}"""}
    ], model, max_tokens=4096)

    try:
        m = __import__("re").search(r"\{[\s\S]*\}", resp)
        quiz = json.loads(m.group()) if m else {"raw": resp}
    except:
        quiz = {"raw": resp}
    return jsonify(quiz)

@app.route("/api/code-review", methods=["POST"])
def code_review():
    """Review and fix code."""
    data  = request.json or {}
    code  = data.get("code", "")
    lang  = data.get("language", "auto-detect")
    model = data.get("model", "llama-3.3-70b-versatile")

    resp = groq_call([
        {"role":"system","content":SYSTEMS["code"]},
        {"role":"user","content":f"""Review this {lang} code and provide:
1. **Issues Found** — bugs, security issues, performance problems
2. **Fixed Code** — complete corrected version (ALL lines)
3. **Improvements** — optimizations, best practices
4. **Explanation** — what each fix does and why

Code to review:
```{lang}
{code}
```"""}
    ], model, max_tokens=8192)
    return jsonify({"review": resp})

@app.route("/api/translate", methods=["POST"])
def translate():
    """Translate text."""
    data   = request.json or {}
    text   = data.get("text", "")
    target = data.get("target_lang", "Arabic")
    model  = data.get("model", "llama-3.1-8b-instant")

    resp = groq_call([
        {"role":"user","content":f"Translate to {target}. Return ONLY the translation:\n\n{text}"}
    ], model, max_tokens=4096)
    return jsonify({"translation": resp, "target": target})

@app.route("/api/summarize", methods=["POST"])
def summarize():
    """Summarize text or document."""
    data  = request.json or {}
    text  = data.get("text", "")
    style = data.get("style", "comprehensive")
    model = data.get("model", "llama-3.3-70b-versatile")

    resp = groq_call([
        {"role":"user","content":f"""Provide a {style} summary of this text.
Include: main points, key findings, important details, conclusion.

Text: {text[:8000]}"""}
    ], model, max_tokens=2048)
    return jsonify({"summary": resp})

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat(), "by": "Muaaz Iqbal | Muslim Islam Org"})

# ─────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────
def _md_to_html(text):
    import re
    text = re.sub(r"^# (.+)$", r"<h1>\1</h1>", text, flags=re.MULTILINE)
    text = re.sub(r"^## (.+)$", r"<h2>\1</h2>", text, flags=re.MULTILINE)
    text = re.sub(r"^### (.+)$", r"<h3>\1</h3>", text, flags=re.MULTILINE)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(r"^- (.+)$", r"<li>\1</li>", text, flags=re.MULTILINE)
    text = text.replace("\n\n", "</p><p>")
    return "<p>" + text + "</p>"

# ─────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"MI AI Backend starting on port {port}")
    print("By Muaaz Iqbal | Muslim Islam Org")
    print("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")
    app.run(host="0.0.0.0", port=port, debug=False)
