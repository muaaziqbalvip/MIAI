// ============================================
// MI AI - Universal File Processor
// Handles: PDF, Images, ZIP, Code, Spreadsheets, 
//          Word Docs, JSON, CSV, M3U, and more
// By Muaaz Iqbal | Muslim Islam Org
// ============================================

let uploadedFiles = [];

// ---- Handle File Upload ----
async function handleFileUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  showToast(`Processing ${files.length} file(s)...`, 'info');

  for (const file of files) {
    try {
      const processed = await processFile(file);
      uploadedFiles.push(processed);
      addFilePreview(processed);
    } catch (err) {
      showToast(`Failed to process: ${file.name}`, 'error');
      console.error('File error:', err);
    }
  }

  if (uploadedFiles.length > 0) {
    document.getElementById('file-preview-bar').classList.remove('hidden');
    showToast(`${uploadedFiles.length} file(s) ready for analysis`, 'success');
  }

  // Reset input
  event.target.value = '';
}

// ---- Process Individual File ----
async function processFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const fileInfo = {
    name: file.name,
    type: file.type || getMimeType(ext),
    size: file.size,
    ext,
    content: '',
    rawFile: file
  };

  try {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
      fileInfo.content = await processImage(file);
      fileInfo.category = 'image';
      fileInfo.dataUrl = fileInfo.content;
    } else if (ext === 'pdf') {
      fileInfo.content = await processPDFFile(file);
      fileInfo.category = 'pdf';
    } else if (ext === 'zip') {
      fileInfo.content = await processZIPFile(file);
      fileInfo.category = 'zip';
    } else if (['js', 'ts', 'py', 'html', 'css', 'php', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'rb', 'swift', 'kt', 'dart', 'r', 'sql', 'sh', 'bash', 'ps1', 'lua', 'scala', 'vue', 'jsx', 'tsx'].includes(ext)) {
      fileInfo.content = await processTextFile(file);
      fileInfo.category = 'code';
    } else if (['txt', 'md', 'markdown', 'rst', 'log', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf'].includes(ext)) {
      fileInfo.content = await processTextFile(file);
      fileInfo.category = 'text';
    } else if (['json', 'jsonl'].includes(ext)) {
      fileInfo.content = await processJSONFile(file);
      fileInfo.category = 'json';
    } else if (['csv', 'tsv'].includes(ext)) {
      fileInfo.content = await processCSVFile(file);
      fileInfo.category = 'csv';
    } else if (['xlsx', 'xls'].includes(ext)) {
      fileInfo.content = await processSpreadsheet(file);
      fileInfo.category = 'spreadsheet';
    } else if (['doc', 'docx'].includes(ext)) {
      fileInfo.content = await processWordDoc(file);
      fileInfo.category = 'document';
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      fileInfo.content = `[Audio File: ${file.name} - ${formatFileSize(file.size)}]`;
      fileInfo.category = 'audio';
    } else if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
      fileInfo.content = `[Video File: ${file.name} - ${formatFileSize(file.size)}]`;
      fileInfo.category = 'video';
    } else if (ext === 'm3u' || ext === 'm3u8') {
      fileInfo.content = await processM3UFile(file);
      fileInfo.category = 'm3u';
    } else if (['xml', 'html', 'htm'].includes(ext)) {
      fileInfo.content = await processTextFile(file);
      fileInfo.category = 'markup';
    } else {
      // Try reading as text
      try {
        fileInfo.content = await processTextFile(file);
        fileInfo.category = 'text';
      } catch {
        fileInfo.content = `[Binary File: ${file.name} - ${formatFileSize(file.size)}]`;
        fileInfo.category = 'binary';
      }
    }
  } catch (err) {
    fileInfo.content = `[Error reading file: ${err.message}]`;
    fileInfo.category = 'error';
  }

  return fileInfo;
}

// ---- Image Processor ----
async function processImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---- PDF File Processor ----
async function processPDFFile(file) {
  // Read as text attempt
  try {
    const text = await processTextFile(file);
    if (text && text.length > 100) return text;
  } catch {}

  // Return metadata if can't extract
  return `[PDF File: ${file.name}\nSize: ${formatFileSize(file.size)}\nNote: Text extraction from binary PDF requires server-side processing. File uploaded successfully.]`;
}

// ---- ZIP File Processor ----
async function processZIPFile(file) {
  try {
    const JSZip = window.JSZip;
    if (!JSZip) return `[ZIP File: ${file.name} - ${formatFileSize(file.size)}]`;

    const zip = await JSZip.loadAsync(file);
    let content = `📦 ZIP Archive: ${file.name} (${formatFileSize(file.size)})\n`;
    content += `📁 Contents:\n`;

    const files = [];
    zip.forEach((relativePath, zipEntry) => {
      files.push({ path: relativePath, entry: zipEntry, isDir: zipEntry.dir });
    });

    // List structure
    files.forEach(f => {
      content += `  ${f.isDir ? '📁' : '📄'} ${f.path}\n`;
    });

    content += `\n📊 Total files: ${files.filter(f => !f.isDir).length}\n`;
    content += `📁 Total folders: ${files.filter(f => f.isDir).length}\n\n`;

    // Read text files
    const textExtensions = ['js', 'ts', 'py', 'html', 'css', 'txt', 'md', 'json', 'yaml', 'yml', 'sh', 'php', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'rb', 'sql'];

    let readCount = 0;
    for (const { path, entry, isDir } of files) {
      if (isDir) continue;
      const ext = path.split('.').pop().toLowerCase();
      if (!textExtensions.includes(ext)) continue;
      if (readCount >= 10) break; // Limit to 10 files to avoid too much data

      try {
        const text = await entry.async('string');
        const lines = text.split('\n').length;
        content += `\n--- File: ${path} (${lines} lines) ---\n`;
        content += text.substring(0, 3000); // First 3000 chars per file
        if (text.length > 3000) content += '\n... [truncated for display] ...';
        content += '\n';
        readCount++;
      } catch {}
    }

    return content;
  } catch (err) {
    return `[ZIP File: ${file.name} - Error: ${err.message}]`;
  }
}

// ---- Text File Processor ----
async function processTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

// ---- JSON File Processor ----
async function processJSONFile(file) {
  const text = await processTextFile(file);
  try {
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    const keys = Object.keys(parsed);
    const type = Array.isArray(parsed) ? 'Array' : 'Object';
    return `JSON ${type}: ${file.name}\nKeys/Length: ${Array.isArray(parsed) ? parsed.length + ' items' : keys.slice(0, 10).join(', ')}\n\n${formatted.substring(0, 8000)}`;
  } catch {
    return text;
  }
}

// ---- CSV File Processor ----
async function processCSVFile(file) {
  const text = await processTextFile(file);
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0]?.split(',') || [];
  const rowCount = lines.length - 1;

  let analysis = `CSV File: ${file.name}\n`;
  analysis += `Columns (${headers.length}): ${headers.map(h => h.trim()).join(', ')}\n`;
  analysis += `Rows: ${rowCount}\n\n`;
  analysis += `Preview (first 20 rows):\n`;
  analysis += lines.slice(0, 21).join('\n');

  return analysis;
}

// ---- Spreadsheet Processor ----
async function processSpreadsheet(file) {
  // If SheetJS is available
  if (window.XLSX) {
    try {
      const data = await readFileAsArrayBuffer(file);
      const wb = window.XLSX.read(data, { type: 'array' });
      let content = `Spreadsheet: ${file.name}\nSheets: ${wb.SheetNames.join(', ')}\n\n`;

      wb.SheetNames.slice(0, 3).forEach(name => {
        const ws = wb.Sheets[name];
        const csv = window.XLSX.utils.sheet_to_csv(ws);
        const lines = csv.split('\n').filter(l => l.trim());
        content += `\n=== Sheet: ${name} (${lines.length} rows) ===\n`;
        content += lines.slice(0, 50).join('\n');
      });

      return content;
    } catch {}
  }

  return `[Spreadsheet: ${file.name} - ${formatFileSize(file.size)}]\nSheetJS library needed for detailed analysis.`;
}

// ---- Word Document Processor ----
async function processWordDoc(file) {
  return `[Word Document: ${file.name} - ${formatFileSize(file.size)}]\nNote: Word document text extraction requires mammoth.js library.`;
}

// ---- M3U Playlist Processor ----
async function processM3UFile(file) {
  const text = await processTextFile(file);
  const lines = text.split('\n').filter(l => l.trim());
  const channels = lines.filter(l => !l.startsWith('#')).length;
  const groups = new Set();

  lines.forEach(line => {
    const groupMatch = line.match(/group-title="([^"]+)"/);
    if (groupMatch) groups.add(groupMatch[1]);
  });

  return `M3U Playlist: ${file.name}\nTotal Channels: ${channels}\nGroups: ${Array.from(groups).join(', ')}\n\nPlaylist content:\n${text.substring(0, 5000)}`;
}

// ---- Helper: Read as ArrayBuffer ----
async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(new Uint8Array(e.target.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ---- Get MIME Type ----
function getMimeType(ext) {
  const types = {
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'json': 'application/json',
    'csv': 'text/csv',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'py': 'text/x-python',
    'xml': 'application/xml'
  };
  return types[ext] || 'application/octet-stream';
}

// ---- Format File Size ----
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// ---- File Icon ----
function getFileIcon(category, ext) {
  const icons = {
    'image': '🖼️',
    'pdf': '📄',
    'zip': '📦',
    'code': '💻',
    'text': '📝',
    'json': '🔧',
    'csv': '📊',
    'spreadsheet': '📊',
    'document': '📃',
    'audio': '🎵',
    'video': '🎬',
    'm3u': '📺',
    'markup': '🌐',
    'binary': '💾',
    'error': '❌'
  };
  return icons[category] || '📁';
}

// ---- Add File Preview ----
function addFilePreview(file) {
  const preview = document.getElementById('file-previews');
  const item = document.createElement('div');
  item.className = 'file-preview-item';
  item.id = 'preview_' + file.name.replace(/[^a-z0-9]/gi, '_');

  item.innerHTML = `
    <span>${getFileIcon(file.category, file.ext)}</span>
    <span title="${file.name}">${file.name.length > 20 ? file.name.substring(0, 18) + '...' : file.name}</span>
    <span style="color: var(--text-muted); font-size: 0.72rem">(${formatFileSize(file.size)})</span>
    <button class="remove-file" onclick="removeFile('${file.name}')">×</button>
  `;

  preview.appendChild(item);
}

// ---- Remove File ----
function removeFile(name) {
  uploadedFiles = uploadedFiles.filter(f => f.name !== name);
  const el = document.getElementById('preview_' + name.replace(/[^a-z0-9]/gi, '_'));
  if (el) el.remove();

  if (uploadedFiles.length === 0) {
    document.getElementById('file-preview-bar').classList.add('hidden');
  }
}

// ---- Clear All Files ----
function clearFiles() {
  uploadedFiles = [];
  document.getElementById('file-previews').innerHTML = '';
  document.getElementById('file-preview-bar').classList.add('hidden');
}

// ---- Generate Spreadsheet ----
async function generateSpreadsheet(prompt) {
  showToast('Generating spreadsheet...', 'info');

  const content = await getQuickResponse(
    `Create a spreadsheet/table with this data: ${prompt}
     Return ONLY CSV format with headers in first row.
     Make it comprehensive and well-organized.`,
    'llama-3.3-70b-versatile'
  );

  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MI-AI_spreadsheet_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Spreadsheet downloaded!', 'success');
  return content;
}

// ---- Generate Word Document ----
async function generateWordDocument(prompt) {
  showToast('Generating Word document...', 'info');

  const content = await getQuickResponse(
    `Create a professional Word document about: ${prompt}
     Format with proper headings, paragraphs, bullet points.
     Make it comprehensive and professional.`,
    'llama-3.3-70b-versatile',
    SYSTEM_PROMPTS.pdf
  );

  // Create as HTML that can be opened by Word
  const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${prompt}</title>
<style>
body { font-family: 'Calibri', sans-serif; margin: 3cm; color: #333; }
h1 { color: #2C3E50; border-bottom: 2px solid #3498DB; }
h2 { color: #34495E; }
p { line-height: 1.6; }
</style>
</head>
<body>${markdownToHTML(content)}</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MI-AI_document_${Date.now()}.doc`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Word document downloaded!', 'success');
  return content;
}

// ---- Simple Markdown to HTML ----
function markdownToHTML(text) {
  return text
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
