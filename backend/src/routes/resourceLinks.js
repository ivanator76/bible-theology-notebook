const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const links = db.prepare('SELECT * FROM resource_links').all();
  res.json(links.map(l => ({ noteId: l.note_id, resourceId: l.resource_id })));
});

router.post('/', (req, res) => {
  const { noteId, resourceId } = req.body;
  db.prepare('INSERT OR IGNORE INTO resource_links (note_id, resource_id) VALUES (?, ?)').run(noteId, resourceId);
  res.json({ ok: true });
});

router.delete('/', (req, res) => {
  const { noteId, resourceId } = req.body.noteId ? req.body : req.query;
  db.prepare('DELETE FROM resource_links WHERE note_id = ? AND resource_id = ?').run(noteId, resourceId);
  res.json({ ok: true });
});

module.exports = router;
