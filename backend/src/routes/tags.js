const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const btTags = db.prepare('SELECT * FROM bt_tags ORDER BY sort_order').all()
    .map(t => ({ id: t.id, name: t.name, color: t.color }));
  const stTags = db.prepare('SELECT * FROM st_tags ORDER BY sort_order').all()
    .map(t => ({ id: t.id, name: t.name, color: t.color }));
  res.json({ btTags, stTags });
});

router.put('/bt', (req, res) => {
  const tags = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO bt_tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
  const deleteOld = db.prepare('DELETE FROM bt_tags WHERE id NOT IN (' + tags.map(() => '?').join(',') + ')');
  const tx = db.transaction(() => {
    tags.forEach((t, i) => upsert.run(t.id, t.name, t.color, i));
    if (tags.length > 0) deleteOld.run(...tags.map(t => t.id));
    else db.prepare('DELETE FROM bt_tags').run();
  });
  tx();
  res.json({ ok: true });
});

router.put('/st', (req, res) => {
  const tags = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO st_tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
  const tx = db.transaction(() => {
    tags.forEach((t, i) => upsert.run(t.id, t.name, t.color, i));
    if (tags.length > 0) {
      db.prepare('DELETE FROM st_tags WHERE id NOT IN (' + tags.map(() => '?').join(',') + ')').run(...tags.map(t => t.id));
    } else {
      db.prepare('DELETE FROM st_tags').run();
    }
  });
  tx();
  res.json({ ok: true });
});

module.exports = router;
