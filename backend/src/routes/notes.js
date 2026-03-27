const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all notes
router.get('/', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
  res.json(notes.map(n => ({
    id: n.id,
    bookId: n.book_id,
    chapterStart: n.chapter_start,
    chapterEnd: n.chapter_end,
    verseStart: n.verse_start,
    verseEnd: n.verse_end,
    title: n.title,
    content: n.content,
    btTags: JSON.parse(n.bt_tags || '[]'),
    stTags: JSON.parse(n.st_tags || '[]'),
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  })));
});

// POST create note
router.post('/', (req, res) => {
  const { id, bookId, chapterStart, chapterEnd, verseStart, verseEnd, title, content, btTags, stTags, createdAt, updatedAt } = req.body;
  db.prepare(`INSERT INTO notes (id, book_id, chapter_start, chapter_end, verse_start, verse_end, title, content, bt_tags, st_tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, bookId, chapterStart || null, chapterEnd || null, verseStart || null, verseEnd || null,
    title || null, content || null, JSON.stringify(btTags || []), JSON.stringify(stTags || []),
    createdAt || Date.now(), updatedAt || Date.now()
  );
  res.json({ id });
});

// PUT update note
router.put('/:id', (req, res) => {
  const { bookId, chapterStart, chapterEnd, verseStart, verseEnd, title, content, btTags, stTags, updatedAt } = req.body;
  db.prepare(`UPDATE notes SET book_id=?, chapter_start=?, chapter_end=?, verse_start=?, verse_end=?, title=?, content=?, bt_tags=?, st_tags=?, updated_at=? WHERE id=?`).run(
    bookId, chapterStart || null, chapterEnd || null, verseStart || null, verseEnd || null,
    title || null, content || null, JSON.stringify(btTags || []), JSON.stringify(stTags || []),
    updatedAt || Date.now(), req.params.id
  );
  res.json({ id: req.params.id });
});

// DELETE note
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ deleted: req.params.id });
});

module.exports = router;
