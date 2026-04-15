// ============================================
// MI AI - Advanced PDF Generator
// Creates books, papers, manuals with cover images
// By Muaaz Iqbal | Muslim Islam Org
// ============================================

// ---- Open PDF Modal ----
function generatePDF() {
  openModal('pdf-modal');
}

// ---- Execute PDF Generation ----
async function executePDFGeneration() {
  const topic = document.getElementById('pdf-topic').value.trim();
  const pages = parseInt(document.getElementById('pdf-pages').value) || 50;
  const type = document.getElementById('pdf-type').value;
  const details = document.getElementById('pdf-details').value.trim();
  const includeCover = document.getElementById('pdf-cover').checked;
  const includeToc = document.getElementById('pdf-toc').checked;

  if (!topic) {
    showToast('Please enter a topic', 'error');
    return;
  }

  closeModal();

  // Show progress in chat
  const progressId = appendProgressMessage(`📚 Generating PDF book: "${topic}"...`);
  hideWelcome();

  try {
    // Generate book content
    updateProgress(progressId, 'Generating book outline...', 10);
    const outline = await generateStructuredContent(topic, 'book-outline', details);

    updateProgress(progressId, 'Writing chapters...', 25);

    // Calculate chapters based on pages
    const chaptersNeeded = Math.max(5, Math.floor(pages / 10));
    let fullContent = [];

    // Generate each chapter
    for (let i = 1; i <= Math.min(chaptersNeeded, 15); i++) {
      updateProgress(progressId, `Writing Chapter ${i} of ${Math.min(chaptersNeeded, 15)}...`, 25 + (i / Math.min(chaptersNeeded, 15)) * 50);

      const chapterContent = await getQuickResponse(
        `Write Chapter ${i} for a ${type} book about "${topic}". 
         Based on this outline: ${outline.substring(0, 500)}
         Write at least ${Math.floor((pages / Math.min(chaptersNeeded, 15)) * 300)} words.
         Make it detailed, informative, and engaging.
         ${type === 'islamic' ? 'Include relevant Quranic verses and hadith. Start with بِسْمِ اللَّهِ' : ''}`,
        'llama-3.3-70b-versatile',
        SYSTEM_PROMPTS.pdf
      );
      fullContent.push({ chapter: i, content: chapterContent });
    }

    updateProgress(progressId, 'Building PDF document...', 80);

    // Create PDF with jsPDF
    await createPDFDocument({
      topic,
      type,
      outline,
      chapters: fullContent,
      includeCover,
      includeToc,
      pages,
      details
    });

    updateProgress(progressId, 'PDF ready!', 100);
    removeProgressMessage(progressId);

  } catch (err) {
    removeProgressMessage(progressId);
    appendMessage('assistant', `❌ PDF generation failed: ${err.message}`, true);
    console.error('PDF error:', err);
  }
}

// ---- Create PDF Document ----
async function createPDFDocument({ topic, type, outline, chapters, includeCover, includeToc, pages, details }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // ---- COVER PAGE ----
  if (includeCover) {
    // Background gradient effect
    doc.setFillColor(10, 10, 30);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Top decoration bar
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, pageWidth, 8, 'F');

    // Bottom decoration bar
    doc.setFillColor(0, 212, 170);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');

    // Side accents
    doc.setFillColor(108, 99, 255, 0.5);
    doc.rect(0, 0, 3, pageHeight, 'F');
    doc.setFillColor(0, 212, 170, 0.5);
    doc.rect(pageWidth - 3, 0, 3, pageHeight, 'F');

    // MI AI Logo text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(108, 99, 255);
    doc.text('MI AI', pageWidth / 2, 30, { align: 'center' });

    // Decorative line
    doc.setDrawColor(108, 99, 255);
    doc.setLineWidth(0.5);
    doc.line(margin + 20, 35, pageWidth - margin - 20, 35);

    // Type badge
    const typeColors = {
      'educational': [0, 212, 170],
      'islamic': [255, 215, 0],
      'technical': [108, 99, 255],
      'novel': [255, 107, 107],
      'research': [100, 180, 255]
    };
    const tc = typeColors[type] || [200, 200, 200];
    doc.setFillColor(tc[0], tc[1], tc[2]);
    doc.roundedRect(pageWidth / 2 - 30, 42, 60, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(10, 10, 30);
    doc.text(type.toUpperCase(), pageWidth / 2, 48.5, { align: 'center' });

    // Main Title
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(240, 240, 255);
    const titleLines = doc.splitTextToSize(topic.toUpperCase(), contentWidth - 20);
    const titleFontSize = titleLines.length > 2 ? 22 : 28;
    doc.setFontSize(titleFontSize);
    let titleY = pageHeight / 2 - 30;
    titleLines.forEach(line => {
      doc.text(line, pageWidth / 2, titleY, { align: 'center' });
      titleY += titleFontSize * 0.5;
    });

    // Decorative dots
    doc.setFillColor(108, 99, 255);
    for (let i = 0; i < 5; i++) {
      doc.circle(pageWidth / 2 - 16 + (i * 8), titleY + 8, 1.5, 'F');
    }

    // Islamic text if Islamic book
    if (type === 'islamic') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);
      doc.setTextColor(255, 215, 0);
      doc.text('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', pageWidth / 2, titleY + 25, { align: 'center' });
    }

    // Details if provided
    if (details) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(160, 160, 192);
      const detailLines = doc.splitTextToSize(details, contentWidth - 30);
      let dy = titleY + (type === 'islamic' ? 40 : 25);
      detailLines.slice(0, 3).forEach(line => {
        doc.text(line, pageWidth / 2, dy, { align: 'center' });
        dy += 6;
      });
    }

    // Pages info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 140);
    doc.text(`${chapters.length} Chapters • ${pages} Pages`, pageWidth / 2, pageHeight - 40, { align: 'center' });

    // Author
    doc.setFillColor(30, 30, 50);
    doc.rect(margin, pageHeight - 32, contentWidth, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(108, 99, 255);
    doc.text('MI AI', margin + 8, pageHeight - 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 192);
    doc.text('by Muaaz Iqbal | Muslim Islam Org', margin + 8, pageHeight - 18);

    // Date
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 140);
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      pageWidth - margin, pageHeight - 24, { align: 'right' });

    doc.addPage();
  }

  // ---- TABLE OF CONTENTS ----
  if (includeToc) {
    doc.setFillColor(10, 10, 30);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, pageWidth, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(240, 240, 255);
    doc.text('Table of Contents', pageWidth / 2, 30, { align: 'center' });

    doc.setDrawColor(108, 99, 255);
    doc.setLineWidth(0.3);
    doc.line(margin, 35, pageWidth - margin, 35);

    let tocY = 50;
    doc.setFontSize(11);

    chapters.forEach((ch, i) => {
      if (tocY > pageHeight - 30) {
        doc.addPage();
        doc.setFillColor(10, 10, 30);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        tocY = 30;
      }

      const chapterTitle = extractChapterTitle(ch.content, i + 1);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(108, 99, 255);
      doc.text(`Chapter ${i + 1}`, margin, tocY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 220);
      const titleText = doc.splitTextToSize(chapterTitle, contentWidth - 60);
      doc.text(titleText[0], margin + 35, tocY);

      doc.setTextColor(100, 100, 140);
      doc.text(`${i * Math.floor(pages / chapters.length) + (includeCover ? 3 : 1)}`, pageWidth - margin, tocY, { align: 'right' });

      // Dotted line
      doc.setDrawColor(50, 50, 80);
      doc.setLineWidth(0.2);
      const textEnd = margin + 35 + doc.getTextWidth(titleText[0]) + 3;
      const lineEnd = pageWidth - margin - doc.getTextWidth(String(i + 2)) - 2;
      if (textEnd < lineEnd - 10) {
        doc.setLineDashPattern([1, 2], 0);
        doc.line(textEnd, tocY - 1, lineEnd, tocY - 1);
        doc.setLineDashPattern([], 0);
      }

      tocY += 12;
    });

    doc.addPage();
  }

  // ---- CHAPTER PAGES ----
  chapters.forEach((ch, chIndex) => {
    // Chapter title page
    doc.setFillColor(10, 10, 30);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Chapter accent
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, 6, pageHeight, 'F');

    // Chapter number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(48);
    doc.setTextColor(25, 25, 50);
    doc.text(String(chIndex + 1).padStart(2, '0'), pageWidth - margin, pageHeight / 2, { align: 'right' });

    // Chapter label
    doc.setFontSize(11);
    doc.setTextColor(108, 99, 255);
    doc.text(`CHAPTER ${chIndex + 1}`, margin + 15, pageHeight / 2 - 20);

    // Chapter title
    const chTitle = extractChapterTitle(ch.content, chIndex + 1);
    doc.setFontSize(22);
    doc.setTextColor(240, 240, 255);
    const chTitleLines = doc.splitTextToSize(chTitle, contentWidth - 40);
    chTitleLines.forEach((line, li) => {
      doc.text(line, margin + 15, pageHeight / 2 + (li * 12));
    });

    // Bottom bar
    doc.setFillColor(0, 212, 170);
    doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');

    doc.addPage();

    // Chapter content
    doc.setFillColor(12, 12, 20);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header
    doc.setFillColor(15, 15, 28);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(108, 99, 255);
    doc.text('MI AI', margin, 9);
    doc.setTextColor(100, 100, 140);
    doc.text(topic.substring(0, 50), pageWidth / 2, 9, { align: 'center' });
    doc.text(`Chapter ${chIndex + 1}`, pageWidth - margin, 9, { align: 'right' });

    // Content
    const cleanContent = cleanContentForPDF(ch.content);
    const contentLines = doc.splitTextToSize(cleanContent, contentWidth);

    let y = 28;
    const lineHeight = 6.5;
    let pageNum = includeCover ? chIndex * 3 + 3 : chIndex * 3 + 1;
    let isFirstPage = true;

    contentLines.forEach(line => {
      if (y > pageHeight - 20) {
        // Footer
        addPDFFooter(doc, pageWidth, pageHeight, margin, pageNum, topic);
        doc.addPage();
        pageNum++;

        doc.setFillColor(12, 12, 20);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setFillColor(15, 15, 28);
        doc.rect(0, 0, pageWidth, 14, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(108, 99, 255);
        doc.text('MI AI', margin, 9);
        doc.setTextColor(100, 100, 140);
        doc.text(topic.substring(0, 50), pageWidth / 2, 9, { align: 'center' });
        doc.text(`Chapter ${chIndex + 1}`, pageWidth - margin, 9, { align: 'right' });

        y = 28;
        isFirstPage = false;
      }

      // Detect headings
      if (line.match(/^#{1,3}\s/) || line.match(/^[A-Z][A-Z\s]{5,}$/) || line.match(/^\*\*.*\*\*$/)) {
        const headText = line.replace(/^#{1,3}\s/, '').replace(/\*\*/g, '');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(108, 99, 255);
        if (y > 28) y += 4;
        doc.text(headText, margin, y);
        y += lineHeight + 3;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(220, 220, 235);
      } else if (line.trim() === '') {
        y += lineHeight * 0.5;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(220, 220, 235);
        doc.text(line, margin, y);
        y += lineHeight;
      }
    });

    addPDFFooter(doc, pageWidth, pageHeight, margin, pageNum, topic);

    // Add new page after chapter (except last)
    if (chIndex < chapters.length - 1) {
      doc.addPage();
    }
  });

  // ---- BACK COVER ----
  doc.addPage();
  doc.setFillColor(10, 10, 30);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFillColor(0, 212, 170);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');

  doc.setFillColor(108, 99, 255);
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(40, 40, 70);
  doc.text('MI AI', pageWidth / 2, pageHeight / 2 - 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 120);
  doc.text('Advanced Intelligence by Muaaz Iqbal', pageWidth / 2, pageHeight / 2, { align: 'center' });
  doc.text('Muslim Islam Org', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
  doc.text('Powered by Groq AI', pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });

  // Save PDF
  const filename = `MI-AI_${topic.replace(/\s+/g, '_').substring(0, 30)}_${Date.now()}.pdf`;
  doc.save(filename);

  showToast(`✅ PDF downloaded: ${filename}`, 'success');
  appendMessage('assistant', `✅ **PDF Book Generated Successfully!**\n\n📚 **Title:** ${topic}\n📄 **Chapters:** ${chapters.length}\n📝 **Type:** ${type}\n💾 **File:** ${filename}\n\nThe PDF has been downloaded to your device!`, true);
}

// ---- Helper: Add Footer ----
function addPDFFooter(doc, pageWidth, pageHeight, margin, pageNum, topic) {
  doc.setFillColor(15, 15, 28);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 120);
  doc.text('MI AI by Muaaz Iqbal | Muslim Islam Org', margin, pageHeight - 5);
  doc.setTextColor(108, 99, 255);
  doc.text(String(pageNum), pageWidth - margin, pageHeight - 5, { align: 'right' });
}

// ---- Helper: Extract Chapter Title ----
function extractChapterTitle(content, num) {
  const lines = content.split('\n').filter(l => l.trim());
  for (const line of lines.slice(0, 5)) {
    const clean = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    if (clean.length > 10 && clean.length < 100) return clean;
  }
  return `Chapter ${num}`;
}

// ---- Helper: Clean content for PDF ----
function cleanContentForPDF(text) {
  return text
    .replace(/```[\s\S]*?```/g, '[Code Block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/^[-*+]\s/gm, '• ')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---- Progress Message Helpers ----
function appendProgressMessage(text) {
  const id = 'progress_' + Date.now();
  const html = `
    <div class="message assistant" id="${id}">
      <div class="message-avatar"><img src="https://i.ibb.co/1t0KstMG/file-0000000090007208b1864eebb1423b3e.png" alt="MI AI" /></div>
      <div class="message-content">
        <div class="progress-container">
          <div class="progress-label" id="${id}_label">${text}</div>
          <div class="progress-bar"><div class="progress-fill" id="${id}_bar" style="width:0%"></div></div>
        </div>
      </div>
    </div>`;
  document.getElementById('messages-container').insertAdjacentHTML('beforeend', html);
  scrollToBottom();
  return id;
}

function updateProgress(id, text, percent) {
  const label = document.getElementById(`${id}_label`);
  const bar = document.getElementById(`${id}_bar`);
  if (label) label.textContent = text;
  if (bar) bar.style.width = percent + '%';
  scrollToBottom();
}

function removeProgressMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}
