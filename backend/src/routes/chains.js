const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const chains = db.prepare('SELECT * FROM theme_chains ORDER BY updated_at DESC').all();
  res.json(chains.map(c => ({
    id: c.id, name: c.name, description: c.description, btTagId: c.bt_tag_id,
    noteIds: JSON.parse(c.note_ids || '[]'), createdAt: c.created_at, updatedAt: c.updated_at,
  })));
});

router.post('/', (req, res) => {
  const { id, name, description, btTagId, noteIds, createdAt, updatedAt } = req.body;
  db.prepare(`INSERT INTO theme_chains (id, name, description, bt_tag_id, note_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, name, description || null, btTagId || null, JSON.stringify(noteIds || []),
    createdAt || Date.now(), updatedAt || Date.now()
  );
  res.json({ id });
});

router.put('/:id', (req, res) => {
  const { name, description, btTagId, noteIds, updatedAt } = req.body;
  db.prepare(`UPDATE theme_chains SET name=?, description=?, bt_tag_id=?, note_ids=?, updated_at=? WHERE id=?`).run(
    name, description || null, btTagId || null, JSON.stringify(noteIds || []),
    updatedAt || Date.now(), req.params.id
  );
  res.json({ id: req.params.id });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM theme_chains WHERE id = ?').run(req.params.id);
  res.json({ deleted: req.params.id });
});

module.exports = router;
