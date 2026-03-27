const express = require('express');
const db = require('../db');

const exportRouter = express.Router();
const importRouter = express.Router();

exportRouter.get('/', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes').all().map(n => ({
    id: n.id, bookId: n.book_id, chapterStart: n.chapter_start, chapterEnd: n.chapter_end,
    verseStart: n.verse_start, verseEnd: n.verse_end, title: n.title, content: n.content,
    btTags: JSON.parse(n.bt_tags || '[]'), stTags: JSON.parse(n.st_tags || '[]'),
    createdAt: n.created_at, updatedAt: n.updated_at,
  }));
  const btTags = db.prepare('SELECT * FROM bt_tags ORDER BY sort_order').all()
    .map(t => ({ id: t.id, name: t.name, color: t.color }));
  const stTags = db.prepare('SELECT * FROM st_tags ORDER BY sort_order').all()
    .map(t => ({ id: t.id, name: t.name, color: t.color }));
  const doctrineLinks = db.prepare('SELECT * FROM doctrine_links').all()
    .map(l => ({ noteId: l.note_id, doctrineId: l.doctrine_id, annotation: l.annotation }));
  const resources = db.prepare('SELECT * FROM resources').all().map(r => ({
    id: r.id, type: r.type, title: r.title, url: r.url, author: r.author,
    publication: r.publication, pages: r.pages, summary: r.summary,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
  const resourceLinks = db.prepare('SELECT * FROM resource_links').all()
    .map(l => ({ noteId: l.note_id, resourceId: l.resource_id }));
  const themeChains = db.prepare('SELECT * FROM theme_chains').all().map(c => ({
    id: c.id, name: c.name, description: c.description, btTagId: c.bt_tag_id,
    noteIds: JSON.parse(c.note_ids || '[]'), createdAt: c.created_at, updatedAt: c.updated_at,
  }));
  const crossRefs = db.prepare('SELECT * FROM cross_refs').all().map(r => ({
    id: r.id, fromId: r.from_id, toId: r.to_id, annotation: r.annotation, createdAt: r.created_at,
  }));

  const payload = { notes, btTags, stTags, doctrineLinks, resources, resourceLinks, themeChains, crossRefs, exportedAt: Date.now() };

  res.setHeader('Content-Disposition', 'attachment; filename="bible-notebook-backup.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(payload);
});

importRouter.post('/', (req, res) => {
  const { notes = [], btTags = [], stTags = [], doctrineLinks = [], resources = [], resourceLinks = [], themeChains = [], crossRefs = [] } = req.body;

  const tx = db.transaction(() => {
    // Clear all tables
    db.prepare('DELETE FROM cross_refs').run();
    db.prepare('DELETE FROM resource_links').run();
    db.prepare('DELETE FROM doctrine_links').run();
    db.prepare('DELETE FROM theme_chains').run();
    db.prepare('DELETE FROM resources').run();
    db.prepare('DELETE FROM notes').run();
    db.prepare('DELETE FROM bt_tags').run();
    db.prepare('DELETE FROM st_tags').run();

    // Insert tags
    const insertBt = db.prepare('INSERT INTO bt_tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
    btTags.forEach((t, i) => insertBt.run(t.id, t.name, t.color, i));
    const insertSt = db.prepare('INSERT INTO st_tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
    stTags.forEach((t, i) => insertSt.run(t.id, t.name, t.color, i));

    // Insert notes
    const insertNote = db.prepare(`INSERT INTO notes (id, book_id, chapter_start, chapter_end, verse_start, verse_end, title, content, bt_tags, st_tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    notes.forEach(n => insertNote.run(n.id, n.bookId, n.chapterStart || null, n.chapterEnd || null, n.verseStart || null, n.verseEnd || null, n.title || null, n.content || null, JSON.stringify(n.btTags || []), JSON.stringify(n.stTags || []), n.createdAt || Date.now(), n.updatedAt || Date.now()));

    // Insert doctrine links
    const insertDl = db.prepare('INSERT INTO doctrine_links (note_id, doctrine_id, annotation) VALUES (?, ?, ?)');
    doctrineLinks.forEach(l => insertDl.run(l.noteId, l.doctrineId, l.annotation || ''));

    // Insert resources
    const insertRes = db.prepare('INSERT INTO resources (id, type, title, url, author, publication, pages, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    resources.forEach(r => insertRes.run(r.id, r.type || 'url', r.title, r.url || null, r.author || null, r.publication || null, r.pages || null, r.summary || null, r.createdAt || Date.now(), r.updatedAt || Date.now()));

    // Insert resource links
    const insertRl = db.prepare('INSERT OR IGNORE INTO resource_links (note_id, resource_id) VALUES (?, ?)');
    resourceLinks.forEach(l => insertRl.run(l.noteId, l.resourceId));

    // Insert theme chains
    const insertChain = db.prepare('INSERT INTO theme_chains (id, name, description, bt_tag_id, note_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    themeChains.forEach(c => insertChain.run(c.id, c.name, c.description || null, c.btTagId || null, JSON.stringify(c.noteIds || []), c.createdAt || Date.now(), c.updatedAt || Date.now()));

    // Insert cross refs
    const insertCr = db.prepare('INSERT INTO cross_refs (id, from_id, to_id, annotation, created_at) VALUES (?, ?, ?, ?, ?)');
    crossRefs.forEach(r => insertCr.run(r.id, r.fromId, r.toId, r.annotation || '', r.createdAt || Date.now()));
  });

  tx();
  res.json({ ok: true, imported: { notes: notes.length, resources: resources.length } });
});

module.exports = { exportRouter, importRouter };
