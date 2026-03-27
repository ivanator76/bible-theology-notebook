const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const links = db.prepare('SELECT * FROM doctrine_links').all();
  res.json(links.map(l => ({ noteId: l.note_id, doctrineId: l.doctrine_id, annotation: l.annotation })));
});

router.put('/:noteId', (req, res) => {
  const { noteId } = req.params;
  const links = req.body;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM doctrine_links WHERE note_id = ?').run(noteId);
    const insert = db.prepare('INSERT INTO doctrine_links (note_id, doctrine_id, annotation) VALUES (?, ?, ?)');
    links.forEach(l => insert.run(noteId, l.doctrineId, l.annotation || ''));
  });
  tx();
  res.json({ ok: true });
});

router.delete('/:noteId', (req, res) => {
  db.prepare('DELETE FROM doctrine_links WHERE note_id = ?').run(req.params.noteId);
  res.json({ ok: true });
});

module.exports = router;
