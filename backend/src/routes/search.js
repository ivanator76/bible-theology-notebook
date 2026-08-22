const express = require('express');
const router = express.Router();
const db = require('../db');

const LABELS = {
  note: '筆記',
  doctrine_annotation: '教義註解',
  theme_chain: '追蹤鏈',
  resource: '資料',
};

function termLength(term) {
  return [...term].length;
}

function likeClause(terms) {
  return terms.map(() => '(title LIKE ? OR body LIKE ? OR ref LIKE ?)').join(' AND ');
}

function likeParams(terms) {
  return terms.flatMap(term => {
    const pattern = `%${term}%`;
    return [pattern, pattern, pattern];
  });
}

function likeResults(terms, limit) {
  return db.prepare(`SELECT entity_type, entity_id, parent_id, title, body, ref
    FROM search_index WHERE ${likeClause(terms)} LIMIT ?`)
    .all(...likeParams(terms), limit).map(row => ({ ...row, rank: 0 }));
}

function markTerms(text, terms) {
  const escaped = [...terms].sort((a, b) => b.length - a.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return text;
  return String(text || '').replace(new RegExp(`(${escaped.join('|')})`, 'giu'), '<mark>$1</mark>');
}

function makeSnippet(row, terms) {
  const candidates = [row.body, row.title, row.ref].filter(Boolean);
  const hits = candidates.map(text => {
    const lower = text.toLocaleLowerCase();
    const positions = terms.map(term => lower.indexOf(term.toLocaleLowerCase())).filter(index => index >= 0);
    return { text, index: positions.length ? Math.min(...positions) : -1 };
  });
  const hit = hits.find(item => item.index >= 0) || hits[0] || { text: '', index: 0 };
  const start = Math.max(0, hit.index - 28);
  const end = Math.min(hit.text.length, Math.max(hit.index, 0) + 90);
  const excerpt = `${start ? '…' : ''}${hit.text.slice(start, end)}${end < hit.text.length ? '…' : ''}`;
  return markTerms(excerpt, terms);
}

router.get('/', (req, res) => {
  const query = String(req.query.q || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  if (query.length < 2) return res.json({ query, results: [] });
  const terms = [...new Set(query.split(/\s+/).filter(Boolean))];
  const ftsTerms = terms.filter(term => termLength(term) >= 3);
  const shortTerms = terms.filter(term => termLength(term) < 3);

  let rows;
  try {
    if (!ftsTerms.length) {
      rows = likeResults(terms, limit);
    } else {
      const match = ftsTerms.map(term => `"${term.replace(/"/g, '""')}"`).join(' AND ');
      const shortFilter = shortTerms.length ? ` AND ${likeClause(shortTerms)}` : '';
      rows = db.prepare(`SELECT entity_type, entity_id, parent_id, title, body, ref,
        bm25(search_index, 0.0, 0.0, 0.0, 5.0, 1.0, 2.0) AS rank
        FROM search_index WHERE search_index MATCH ?${shortFilter} ORDER BY rank LIMIT ?`)
        .all(match, ...likeParams(shortTerms), limit);
    }
  } catch {
    // This also covers SQLite builds without the trigram tokenizer.
    rows = likeResults(terms, limit);
  }

  const results = rows.map(row => {
    return {
      type: row.entity_type,
      category: LABELS[row.entity_type] || row.entity_type,
      id: row.entity_id,
      parentId: row.parent_id,
      title: row.title,
      titleSnippet: markTerms(row.title, terms),
      snippet: makeSnippet(row, terms),
      ref: row.ref,
      rank: row.rank,
    };
  });
  res.json({ query, results });
});

module.exports = router;
