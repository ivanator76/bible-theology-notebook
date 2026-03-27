const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const resources = db.prepare('SELECT * FROM resources ORDER BY updated_at DESC').all();
  res.json(resources.map(r => ({
    id: r.id, type: r.type, title: r.title, url: r.url, author: r.author,
    publication: r.publication, pages: r.pages, summary: r.summary,
    createdAt: r.created_at, updatedAt: r.updated_at,
  })));
});

router.post('/', (req, res) => {
  const { id, type, title, url, author, publication, pages, summary, createdAt, updatedAt } = req.body;
  db.prepare(`INSERT INTO resources (id, type, title, url, author, publication, pages, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, type || 'url', title, url || null, author || null, publication || null, pages || null, summary || null,
    createdAt || Date.now(), updatedAt || Date.now()
  );
  res.json({ id });
});

router.put('/:id', (req, res) => {
  const { type, title, url, author, publication, pages, summary, updatedAt } = req.body;
  db.prepare(`UPDATE resources SET type=?, title=?, url=?, author=?, publication=?, pages=?, summary=?, updated_at=? WHERE id=?`).run(
    type || 'url', title, url || null, author || null, publication || null, pages || null, summary || null,
    updatedAt || Date.now(), req.params.id
  );
  res.json({ id: req.params.id });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  res.json({ deleted: req.params.id });
});

module.exports = router;
