const express = require('express');
const router = express.Router();
const db = require('../db');

function toNote(n) {
  return {
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
  };
}

function snapshotNote(note, savedAt = Date.now()) {
  db.prepare(`INSERT INTO note_versions
    (note_id, book_id, chapter_start, chapter_end, verse_start, verse_end, title, content, bt_tags, st_tags, saved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    note.id, note.book_id, note.chapter_start, note.chapter_end, note.verse_start, note.verse_end,
    note.title, note.content, note.bt_tags, note.st_tags, savedAt
  );
}

// GET all notes
router.get('/', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
  res.json(notes.map(toNote));
});

router.get('/:id/versions', (req, res) => {
  const rows = db.prepare('SELECT * FROM note_versions WHERE note_id = ? ORDER BY saved_at DESC').all(req.params.id);
  res.json(rows.map(v => ({
    versionId: v.id, noteId: v.note_id, bookId: v.book_id,
    chapterStart: v.chapter_start, chapterEnd: v.chapter_end,
    verseStart: v.verse_start, verseEnd: v.verse_end,
    title: v.title, content: v.content,
    btTags: JSON.parse(v.bt_tags || '[]'), stTags: JSON.parse(v.st_tags || '[]'),
    savedAt: v.saved_at,
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
  db.rebuildSearchIndex();
  res.json({ id });
});

// PUT update note
router.put('/:id', (req, res) => {
  const { bookId, chapterStart, chapterEnd, verseStart, verseEnd, title, content, btTags, stTags, updatedAt } = req.body;
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '找不到筆記' });
  const next = [bookId, chapterStart || null, chapterEnd || null, verseStart || null, verseEnd || null,
    title || null, content || null, JSON.stringify(btTags || []), JSON.stringify(stTags || [])];
  const previous = [existing.book_id, existing.chapter_start, existing.chapter_end, existing.verse_start,
    existing.verse_end, existing.title, existing.content, existing.bt_tags, existing.st_tags];
  const changed = next.some((value, index) => value !== previous[index]);
  const tx = db.transaction(() => {
    if (changed) snapshotNote(existing);
    db.prepare(`UPDATE notes SET book_id=?, chapter_start=?, chapter_end=?, verse_start=?, verse_end=?, title=?, content=?, bt_tags=?, st_tags=?, updated_at=? WHERE id=?`).run(
      ...next, updatedAt || Date.now(), req.params.id
    );
  });
  tx();
  db.rebuildSearchIndex();
  res.json({ id: req.params.id });
});

router.post('/:id/versions/:versionId/restore', (req, res) => {
  const current = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  const version = db.prepare('SELECT * FROM note_versions WHERE id = ? AND note_id = ?').get(req.params.versionId, req.params.id);
  if (!current || !version) return res.status(404).json({ error: '找不到指定版本' });
  const now = Date.now();
  const tx = db.transaction(() => {
    snapshotNote(current, now);
    db.prepare(`UPDATE notes SET book_id=?, chapter_start=?, chapter_end=?, verse_start=?, verse_end=?,
      title=?, content=?, bt_tags=?, st_tags=?, updated_at=? WHERE id=?`).run(
      version.book_id, version.chapter_start, version.chapter_end, version.verse_start, version.verse_end,
      version.title, version.content, version.bt_tags, version.st_tags, now, req.params.id
    );
  });
  tx();
  db.rebuildSearchIndex();
  res.json({ note: toNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)) });
});

// DELETE note
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  db.rebuildSearchIndex();
  res.json({ deleted: req.params.id });
});

module.exports = router;
