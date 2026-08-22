const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const fontkit = require('fontkit');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Footer,
  AlignmentType, PageNumber,
} = require('docx');
const db = require('../db');
const { BOOK_MAP } = require('../bookMeta');

const router = express.Router();
const BIBLE_DIR = path.join(__dirname, '..', 'bible-data');
const bibleCache = new Map();

function loadBook(translation, bookId) {
  const key = `${translation}/${bookId}`;
  if (!bibleCache.has(key)) {
    try { bibleCache.set(key, JSON.parse(fs.readFileSync(path.join(BIBLE_DIR, translation, `${bookId}.json`), 'utf8'))); }
    catch { bibleCache.set(key, null); }
  }
  return bibleCache.get(key);
}

function noteRef(note) {
  const book = BOOK_MAP[note.book_id];
  const start = note.chapter_start || '';
  let range = start;
  if (note.verse_start) range += `:${note.verse_start}`;
  if (note.chapter_end && note.chapter_end !== note.chapter_start) range += `-${note.chapter_end}${note.verse_end ? `:${note.verse_end}` : ''}`;
  else if (note.verse_end && note.verse_end !== note.verse_start) range += `-${note.verse_end}`;
  return `${book?.zh || note.book_id} ${range}`.trim();
}

function scriptureFor(note) {
  if (!note.chapter_start) return [];
  const rows = [];
  const startChapter = parseInt(note.chapter_start, 10);
  const endChapter = parseInt(note.chapter_end || note.chapter_start, 10);
  const zhBook = loadBook('cuv', note.book_id) || {};
  const enBook = loadBook('web', note.book_id) || {};
  for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
    const zh = zhBook[String(chapter)] || [];
    const en = enBook[String(chapter)] || [];
    const startVerse = chapter === startChapter && note.verse_start ? parseInt(note.verse_start, 10) : 1;
    const fallbackEnd = Math.max(zh.length, en.length);
    const endVerse = chapter === endChapter && note.verse_end ? parseInt(note.verse_end, 10)
      : (chapter === startChapter && chapter === endChapter && note.verse_start ? parseInt(note.verse_start, 10) : fallbackEnd);
    for (let verse = startVerse; verse <= endVerse; verse += 1) {
      const zhVerse = zh.find(v => Number(v.verse) === verse);
      const enVerse = en.find(v => Number(v.verse) === verse);
      rows.push({ chapter, verse, zh: zhVerse?.text || '', en: enVerse?.text || '' });
    }
  }
  return rows;
}

function collectResearch(kind, id) {
  let title;
  let description = '';
  let notes = [];
  if (kind === 'chain') {
    const chain = db.prepare('SELECT * FROM theme_chains WHERE id = ?').get(id);
    if (!chain) return null;
    title = chain.name;
    description = chain.description || '';
    const ids = JSON.parse(chain.note_ids || '[]');
    notes = ids.map(noteId => db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId)).filter(Boolean);
  } else if (kind === 'doctrine') {
    const doctrine = db.prepare('SELECT * FROM st_tags WHERE id = ?').get(id);
    if (!doctrine) return null;
    title = doctrine.name;
    description = '系統神學教義研究彙編';
    notes = db.prepare(`SELECT DISTINCT n.* FROM notes n JOIN doctrine_links dl ON dl.note_id = n.id
      WHERE dl.doctrine_id = ?`).all(id);
  } else return null;

  notes.sort((a, b) => (BOOK_MAP[a.book_id]?.order ?? 999) - (BOOK_MAP[b.book_id]?.order ?? 999)
    || (parseInt(a.chapter_start, 10) || 0) - (parseInt(b.chapter_start, 10) || 0)
    || (parseInt(a.verse_start, 10) || 0) - (parseInt(b.verse_start, 10) || 0));

  const sections = notes.map(note => {
    const doctrines = db.prepare(`SELECT st.name, dl.annotation FROM doctrine_links dl
      LEFT JOIN st_tags st ON st.id = dl.doctrine_id WHERE dl.note_id = ?`).all(note.id);
    const resources = db.prepare(`SELECT r.* FROM resources r JOIN resource_links rl ON rl.resource_id = r.id
      WHERE rl.note_id = ? ORDER BY r.title`).all(note.id);
    return { note, ref: noteRef(note), scripture: scriptureFor(note), doctrines, resources };
  });
  return { kind, id, title, description, sections, generatedAt: Date.now() };
}

function asMarkdown(research) {
  const lines = [`# ${research.title}`, '', research.description, '', `匯出日期：${new Date(research.generatedAt).toLocaleDateString('zh-TW')}`, ''];
  for (const section of research.sections) {
    lines.push(`## ${section.ref}${section.note.title ? ` — ${section.note.title}` : ''}`, '', '### 經文（和合本 / WEB）', '');
    for (const verse of section.scripture) {
      const number = `${verse.chapter}:${verse.verse}`;
      if (verse.zh) lines.push(`> **${number}** ${verse.zh}`);
      if (verse.en) lines.push(`> *${number} ${verse.en}*`);
      lines.push('>');
    }
    lines.push('### 筆記', '', section.note.content || '（無內容）', '');
    if (section.doctrines.length) {
      lines.push('### 教義註解', '');
      section.doctrines.forEach(item => lines.push(`- **${item.name || '教義'}**：${item.annotation || '（無註解）'}`));
      lines.push('');
    }
    if (section.resources.length) {
      lines.push('### 參考資料', '');
      section.resources.forEach(item => lines.push(`- ${item.author ? `${item.author}，` : ''}**${item.title}**${item.publication ? `，${item.publication}` : ''}${item.pages ? `，${item.pages}` : ''}${item.url ? `。${item.url}` : ''}${item.summary ? ` — ${item.summary}` : ''}`));
      lines.push('');
    }
  }
  return lines.join('\n');
}

function docxParagraphs(research) {
  const children = [
    new Paragraph({ text: research.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: research.description || '聖經神學研究彙編', italics: true, color: '666666' })] }),
    new Paragraph({ children: [new TextRun({ text: `匯出日期：${new Date(research.generatedAt).toLocaleDateString('zh-TW')}`, size: 18, color: '777777' })] }),
  ];
  for (const section of research.sections) {
    children.push(new Paragraph({ text: `${section.ref}${section.note.title ? ` — ${section.note.title}` : ''}`, heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ text: '經文（和合本 / WEB）', heading: HeadingLevel.HEADING_2 }));
    for (const verse of section.scripture) {
      const number = `${verse.chapter}:${verse.verse}`;
      if (verse.zh) children.push(new Paragraph({ children: [new TextRun({ text: `${number} `, bold: true }), new TextRun(verse.zh)] }));
      if (verse.en) children.push(new Paragraph({ children: [new TextRun({ text: `${number} ${verse.en}`, italics: true, color: '666666' })] }));
    }
    children.push(new Paragraph({ text: '筆記', heading: HeadingLevel.HEADING_2 }));
    for (const line of (section.note.content || '（無內容）').split(/\r?\n/)) children.push(new Paragraph({ text: line || ' ' }));
    if (section.doctrines.length) {
      children.push(new Paragraph({ text: '教義註解', heading: HeadingLevel.HEADING_2 }));
      section.doctrines.forEach(item => children.push(new Paragraph({ text: `${item.name || '教義'}：${item.annotation || '（無註解）'}`, bullet: { level: 0 } })));
    }
    if (section.resources.length) {
      children.push(new Paragraph({ text: '參考資料', heading: HeadingLevel.HEADING_2 }));
      section.resources.forEach(item => children.push(new Paragraph({ text: [item.author, item.title, item.publication, item.pages, item.url, item.summary].filter(Boolean).join('｜'), bullet: { level: 0 } })));
    }
  }
  return children;
}

function findPdfFont() {
  const candidates = [process.env.PDF_FONT_PATH, '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc', '/System/Library/Fonts/STHeiti Medium.ttc'];
  return candidates.find(file => file && fs.existsSync(file));
}

function normalizePdfText(value) {
  return String(value || '').normalize('NFC')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[「」『』﹁﹂﹃﹄]/g, '"')
    .replace(/[〔【〖]/g, '[')
    .replace(/[〕】〗]/g, ']')
    .replace(/[（）︵︶﹙﹚]/g, character => '（︵﹙'.includes(character) ? '(' : ')')
    .replace(/[—–]/g, '-')
    .replace(/\u00a0/g, ' ');
}

function writePdf(res, research) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 64, right: 64, bottom: 64, left: 64 }, info: { Title: research.title } });
  const font = findPdfFont();
  if (!font) throw new Error('伺服器缺少 CJK PDF 字型');
  const opened = fontkit.openSync(font);
  const faces = opened.fonts || [];
  const face = faces.find(item => /(?:CJK.*TC|TC-|Traditional|CJKtc)/i.test(`${item.familyName} ${item.postscriptName}`)) || faces[0];
  doc.registerFont('CJK', font, face?.postscriptName);
  doc.font('CJK');
  doc.pipe(res);
  doc.fontSize(22).fillColor('#7B6340').text(normalizePdfText(research.title));
  doc.moveDown(0.4).fontSize(10).fillColor('#666666').text(normalizePdfText(research.description || '聖經神學研究彙編'));
  doc.text(normalizePdfText(`匯出日期：${new Date(research.generatedAt).toLocaleDateString('zh-TW')}`)).moveDown(1.2);
  for (const section of research.sections) {
    doc.fontSize(16).fillColor('#7B6340').text(normalizePdfText(`${section.ref}${section.note.title ? ` - ${section.note.title}` : ''}`), { keepTogether: true });
    doc.moveDown(0.5).fontSize(12).fillColor('#2C2417').text(normalizePdfText('經文（和合本 / WEB）'));
    for (const verse of section.scripture) {
      const number = `${verse.chapter}:${verse.verse}`;
      if (verse.zh) doc.fontSize(10).fillColor('#2C2417').text(normalizePdfText(`${number} ${verse.zh}`), { lineGap: 3 });
      if (verse.en) doc.fontSize(9).fillColor('#777777').text(normalizePdfText(`${number} ${verse.en}`), { lineGap: 2 });
    }
    doc.moveDown(0.5).fontSize(12).fillColor('#2C2417').text('筆記');
    doc.fontSize(10).fillColor('#333333').text(normalizePdfText(section.note.content || '（無內容）'), { lineGap: 4 });
    if (section.doctrines.length) {
      doc.moveDown(0.5).fontSize(12).fillColor('#2C2417').text('教義註解');
      section.doctrines.forEach(item => doc.fontSize(10).text(normalizePdfText(`• ${item.name || '教義'}：${item.annotation || '（無註解）'}`), { indent: 10, lineGap: 3 }));
    }
    if (section.resources.length) {
      doc.moveDown(0.5).fontSize(12).fillColor('#2C2417').text('參考資料');
      section.resources.forEach(item => doc.fontSize(9).text(normalizePdfText(`• ${[item.author, item.title, item.publication, item.pages, item.url, item.summary].filter(Boolean).join('｜')}`), { indent: 10, lineGap: 3 }));
    }
    doc.moveDown(1.2);
  }
  doc.end();
}

router.get('/:kind/:id', async (req, res) => {
  const research = collectResearch(req.params.kind, req.params.id);
  if (!research) return res.status(404).json({ error: '找不到研究主題' });
  const format = String(req.query.format || 'markdown').toLowerCase();
  const base = `${req.params.kind}-${req.params.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  try {
    if (format === 'markdown' || format === 'md') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.md"`);
      return res.send(asMarkdown(research));
    }
    if (format === 'docx') {
      const document = new Document({
        styles: {
          default: { document: { run: { font: 'Noto Sans TC', size: 22 }, paragraph: { spacing: { after: 140, line: 300 } } } },
          paragraphStyles: [
            { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Noto Sans TC', size: 44, bold: true, color: '7B6340' }, paragraph: { spacing: { after: 160 } } },
            { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Noto Sans TC', size: 32, bold: true, color: '7B6340' }, paragraph: { spacing: { before: 300, after: 120 }, keepNext: true } },
            { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Noto Sans TC', size: 26, bold: true, color: '2C2417' }, paragraph: { spacing: { before: 180, after: 80 }, keepNext: true } },
          ],
        },
        sections: [{
          properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
          children: docxParagraphs(research),
          footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun('聖經神學筆記 · '), new TextRun({ children: [PageNumber.CURRENT] })] })] }) },
        }],
      });
      const buffer = await Packer.toBuffer(document);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.docx"`);
      return res.send(buffer);
    }
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`);
      return writePdf(res, research);
    }
    return res.status(400).json({ error: '不支援的匯出格式' });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: error.message });
    else res.end();
  }
});

module.exports = router;
