const express = require('express');
const router = express.Router();
const fs   = require('fs');
const path = require('path');

const BIBLE_DIR = path.join(__dirname, '..', 'bible-data');

const NT_BOOKS = new Set([
  'mat','mrk','luk','jhn','act','rom','1co','2co','gal','eph',
  'php','col','1th','2th','1ti','2ti','tit','phm','heb','jas',
  '1pe','2pe','1jn','2jn','3jn','jud','rev',
]);

// Cache parsed JSON files in memory (avoid repeated file reads)
const fileCache = {};

function loadBook(translation, bookId) {
  const key = `${translation}/${bookId}`;
  if (fileCache[key] !== undefined) return fileCache[key];
  try {
    const file = path.join(BIBLE_DIR, translation, `${bookId}.json`);
    fileCache[key] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fileCache[key] = null;
  }
  return fileCache[key];
}

function getChapter(translation, bookId, chapter) {
  const book = loadBook(translation, bookId);
  return book ? (book[String(chapter)] || null) : null;
}

// ── GET /api/bible/:book/:chapter  (CUV + WEB) ───────────────────────────
router.get('/:book/:chapter', (req, res) => {
  const { book, chapter } = req.params;

  const zh = getChapter('cuv',  book, chapter);
  const en = getChapter('web',  book, chapter);

  if (!zh && !en) return res.status(404).json({ error: '經文資料不可用' });
  res.json({ zh, en });
});

// ── GET /api/bible/original/:book/:chapter  (Greek NT / Hebrew OT) ───────
router.get('/original/:book/:chapter', (req, res) => {
  const { book, chapter } = req.params;
  const isNT = NT_BOOKS.has(book);
  const translation = isNT ? 'tisch' : 'wlc';
  const lang = isNT ? 'greek' : 'hebrew';

  const verses = getChapter(translation, book, chapter);
  if (!verses) return res.status(404).json({ error: '原文資料不可用' });
  res.json({ lang, verses });
});

module.exports = router;
