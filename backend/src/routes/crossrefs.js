const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const refs = db.prepare('SELECT * FROM cross_refs ORDER BY created_at DESC').all();
  res.json(refs.map(r => ({
    id: r.id, fromId: r.from_id, toId: r.to_id, annotation: r.annotation, createdAt: r.created_at,
  })));
});

router.post('/', (req, res) => {
  const { id, fromId, toId, annotation, createdAt } = req.body;
  db.prepare('INSERT INTO cross_refs (id, from_id, to_id, annotation, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id, fromId, toId, annotation || '', createdAt || Date.now()
  );
  res.json({ id });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM cross_refs WHERE id = ?').run(req.params.id);
  res.json({ deleted: req.params.id });
});

module.exports = router;
