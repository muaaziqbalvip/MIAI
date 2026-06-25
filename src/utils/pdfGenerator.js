// ============================================
// MI AI - Advanced PDF Generator v2.0
// Complete books, papers, manuals with error handling
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

  const progressId = appendProgressMessage(`📚 Generating PDF: "${topic}"...`);
  hideWelcome();

  try {
    updateProgress(progressId, 'Generating book outline...', 5);

    // Try backend first, fall back to client-side generation
    let outline = '';
    let chapters = [];

    try {
      // Try Python backend
      const backendUrl = window.MI_AI_BACKEND || '';
      if (backendUrl) {
        updateProgress(progressId, 'Using backend for better quality...', 10);
        const resp = await fetch(`${backendUrl}/api/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, pages, type, details })
        });
        if (resp.ok) {
          const data = await resp.json();
          outline = data.outline;
          chapters = data.chapters;
        }
      }
    } catch (backendErr) {
      console.log('[PDF] Backend unavailable, using client-side generation');
    }

    // Client-side generation if backend failed
    if (!outline) {
      updateProgress(progressId, 'Generating outline...', 10);
      outline = await generateStructuredContent(topic, 'book-outline', details);
    }

    if (chapters.length === 0) {
      const chaptersNeeded = Math.max(5, Math.min(15, Math.floor(pages / 10)));
      updateProgress(progressId, `Writing ${chaptersNeeded} chapters...`, 20);

      for (let i = 1; i <= chaptersNeeded; i++) {
        const progress = 20 + (i / chaptersNeeded) * 55;
        updateProgress(progressId, `Writing Chapter ${i} of ${chaptersNeeded}...`, progress);

        try {
          const chapterContent = await getQuickResponse(
            `Write Chapter ${i} for a ${type} book about "${topic}".
Based on this outline: ${outline.substring(0, 500)}
Write at least ${Math.max(600, Math.floor((pages / chaptersNeeded) * 300))} words.
Make it detailed, informative, and engaging.
${type === 'islamic' ? 'Include relevant Quranic verses and hadith. Start with بِسْمِ اللَّهِ' : ''}`,
            'llama-3.3-70b-versatile',
            SYSTEM_PROMPTS.pdf
          );
          chapters.push({ chapter: i, content: chapterContent });
        } catch (chapErr) {
          console.warn(`Chapter ${i} error:`, chapErr);
          chapters.push({ chapter: i, content: `Chapter ${i}: ${topic}\n\n[Content generation failed for this chapter. Please regenerate.]` });
        }
      }
    }

    updateProgress(progressId, 'Building PDF document...', 80);

    await createPDFDocument({
      topic, type, outline, chapters, includeCover, includeToc, pages, details
    });

    updateProgress(progressId, 'PDF ready! ✅', 100);
    setTimeout(() => removeProgressMessage(progressId), 2000);
    appendMessage('assistant', `✅ **PDF Generated Successfully!**\n\n📖 Book: "${topic}"\n📄 Chapters: ${chapters.length}\n💾 Downloaded to your device.`, true);

  } catch (err) {
    removeProgressMessage(progressId);
    console.error('PDF generation error:', err);
    appendMessage('assistant',
      `❌ **PDF generation failed:** ${err.message}\n\n` +
      `**Try:**\n- Shorter topic name\n- Fewer pages\n- Check internet connection\n- Reload and try again`,
      true
    );
  }
}

// ---- Create PDF Document (jsPDF) ----
async function createPDFDocument({ topic, type, outline, chapters, includeCover, includeToc, pages, details }) {
  if (!window.jspdf) {
    throw new Error('jsPDF library not loaded. Please reload the page.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentPage = 1;

  // ---- Helper: Add text with word wrap ----
  function addWrappedText(text, x, y, maxWidth, lineHeight, maxY) {
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > maxY) {
        doc.addPage();
        currentPage++;
        y = margin + 10;
        addPageNumber();
      }
      doc.text(line, x, y);
      y += lineHeight;
    }
    return y;
  }

  // ---- Helper: Add page number ----
  function addPageNumber() {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('MI AI | Muslim Islam Org', margin, pageHeight - 10);
    doc.setTextColor(0, 0, 0);
  }

  // ---- COVER PAGE ----
  if (includeCover) {
    // Dark gradient background
    doc.setFillColor(10, 10, 30);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative border
    doc.setDrawColor(100, 100, 200);
    doc.setLineWidth(1.5);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');
    doc.setLineWidth(0.5);
    doc.rect(11, 11, pageWidth - 22, pageHeight - 22, 'S');

    // Title
    doc.setTextColor(255, 215, 0);
    doc.setFontSize(28);
    const titleLines = doc.splitTextToSize(topic, contentWidth);
    let titleY = pageHeight * 0.35;
    for (const line of titleLines) {
      doc.text(line, pageWidth / 2, titleY, { align: 'center' });
      titleY += 12;
    }

    // Bismillah for Islamic books
    if (type === 'islamic') {
      doc.setFontSize(16);
      doc.setTextColor(200, 180, 100);
      doc.text('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', pageWidth / 2, pageHeight * 0.25, { align: 'center' });
    }

    // Subtitle
    if (details) {
      doc.setFontSize(14);
      doc.setTextColor(180, 180, 220);
      doc.text(details.substring(0, 60), pageWidth / 2, titleY + 10, { align: 'center' });
    }

    // Author
    doc.setFontSize(13);
    doc.setTextColor(150, 200, 255);
    doc.text('By Muaaz Iqbal', pageWidth / 2, pageHeight * 0.7, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(120, 160, 200);
    doc.text('Muslim Islam Org', pageWidth / 2, pageHeight * 0.7 + 8, { align: 'center' });

    // Generated date
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text('Powered by MI AI', pageWidth / 2, pageHeight - 14, { align: 'center' });

    doc.addPage();
    currentPage++;
  }

  // ---- TABLE OF CONTENTS ----
  if (includeToc) {
    doc.setFillColor(248, 248, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFontSize(20);
    doc.setTextColor(30, 30, 80);
    doc.text('Table of Contents', pageWidth / 2, margin + 15, { align: 'center' });

    doc.setDrawColor(100, 100, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 20, pageWidth - margin, margin + 20);

    let tocY = margin + 35;
    doc.setFontSize(12);

    // Preface entry
    doc.setTextColor(60, 60, 100);
    doc.text('Preface', margin + 5, tocY);
    doc.setTextColor(150, 150, 150);
    doc.text('...', pageWidth - margin - 15, tocY);
    tocY += 10;

    // Chapter entries
    for (let i = 0; i < chapters.length; i++) {
      if (tocY > pageHeight - 30) break;
      doc.setTextColor(60, 60, 100);
      doc.text(`Chapter ${i + 1}`, margin + 5, tocY);
      // Extract first line of chapter as title
      const chTitle = chapters[i].content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 40);
      doc.setTextColor(80, 80, 120);
      doc.setFontSize(10);
      doc.text(chTitle || `Chapter ${i + 1}`, margin + 40, tocY);
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text('...', pageWidth - margin - 15, tocY);
      tocY += 10;
    }

    // Conclusion entry
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 100);
    doc.text('Conclusion', margin + 5, tocY + 5);

    addPageNumber();
    doc.addPage();
    currentPage++;
  }

  // ---- PREFACE / OUTLINE ----
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 80);
  doc.text('Preface', margin, margin + 15);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  let y = margin + 30;
  y = addWrappedText(
    outline.replace(/[#*_`]/g, '').substring(0, 1500),
    margin, y, contentWidth, 6, pageHeight - margin
  );
  addPageNumber();
  doc.addPage();
  currentPage++;

  // ---- CHAPTERS ----
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const chText = ch.content || '';

    // Chapter title page
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 80);
    doc.text(`Chapter ${ch.chapter}`, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

    // Try to get chapter subtitle from content
    const firstLine = chText.split('\n').find(l => l.trim().length > 3) || '';
    const chSubtitle = firstLine.replace(/^#+\s*/, '').replace(/\*+/g, '').trim().substring(0, 60);
    if (chSubtitle) {
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 150);
      doc.text(chSubtitle, pageWidth / 2, pageHeight / 2, { align: 'center' });
    }

    addPageNumber();
    doc.addPage();
    currentPage++;

    // Chapter content
    let chY = margin + 15;
    const cleanContent = chText
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .trim();

    const paragraphs = cleanContent.split(/\n\n+/);
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);

    for (const para of paragraphs) {
      if (!para.trim()) continue;
      chY = addWrappedText(para.trim(), margin, chY, contentWidth, 6, pageHeight - margin - 15);
      chY += 4; // Paragraph spacing
    }

    addPageNumber();
    if (i < chapters.length - 1) {
      doc.addPage();
      currentPage++;
    }
  }

  // ---- CONCLUSION ----
  doc.addPage();
  currentPage++;
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 80);
  doc.text('Conclusion', margin, margin + 15);

  const conclusionText = `This book on "${topic}" has covered the essential aspects of the subject comprehensively. The chapters provided in-depth analysis, practical insights, and detailed information to help readers understand and apply the knowledge gained.\n\nWe hope this work serves as a valuable resource and contributes positively to your understanding of ${topic}.`;
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  addWrappedText(conclusionText, margin, margin + 35, contentWidth, 6, pageHeight - margin);
  addPageNumber();

  // ---- BACK COVER ----
  doc.addPage();
  currentPage++;
  doc.setFillColor(10, 10, 30);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFontSize(14);
  doc.setTextColor(150, 200, 255);
  doc.text('MI AI — Powered by Muslim Islam Org', pageWidth / 2, pageHeight / 2, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(100, 150, 200);
  doc.text('By Muaaz Iqbal', pageWidth / 2, pageHeight / 2 + 12, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(80, 100, 150);
  doc.text('Govt. Islamia Graduate College — ICS', pageWidth / 2, pageHeight / 2 + 22, { align: 'center' });

  // Save PDF
  const safeTitle = topic.replace(/[^a-zA-Z0-9\s]/g, '').trim().substring(0, 40);
  doc.save(`MI-AI-${safeTitle || 'Book'}.pdf`);
}
