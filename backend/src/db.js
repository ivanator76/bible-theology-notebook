const Database = require('better-sqlite3');
const path = require('path');
const { BOOK_MAP } = require('./bookMeta');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/notebook.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter_start TEXT,
    chapter_end TEXT,
    verse_start TEXT,
    verse_end TEXT,
    title TEXT,
    content TEXT,
    bt_tags TEXT DEFAULT '[]',
    st_tags TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bt_tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS st_tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS doctrine_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id TEXT NOT NULL,
    doctrine_id TEXT NOT NULL,
    annotation TEXT,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'url',
    title TEXT NOT NULL,
    url TEXT,
    author TEXT,
    publication TEXT,
    pages TEXT,
    summary TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resource_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    UNIQUE(note_id, resource_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS theme_chains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    bt_tag_id TEXT,
    note_ids TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cross_refs (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    annotation TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (from_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (to_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bible_cache (
    cache_key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    cached_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS note_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    chapter_start TEXT,
    chapter_end TEXT,
    verse_start TEXT,
    verse_end TEXT,
    title TEXT,
    content TEXT,
    bt_tags TEXT DEFAULT '[]',
    st_tags TEXT DEFAULT '[]',
    saved_at INTEGER NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    result_json TEXT NOT NULL,
    raw_text TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(note_id, saved_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_suggestions_note ON ai_suggestions(note_id, created_at DESC);
`);

// A single denormalized FTS index keeps command-palette searches fast while
// still covering annotations and descriptions that live outside `notes`.
try {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    entity_type UNINDEXED, entity_id UNINDEXED, parent_id UNINDEXED,
    title, body, ref, tokenize='trigram case_sensitive 0'
  )`);
} catch {
  // Older SQLite builds may not expose the trigram tokenizer. unicode61 still
  // provides a working FTS5 index (the search route adds a LIKE fallback).
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    entity_type UNINDEXED, entity_id UNINDEXED, parent_id UNINDEXED,
    title, body, ref, tokenize='unicode61 remove_diacritics 2'
  )`);
}

// Seed default tags if empty
const btCount = db.prepare('SELECT COUNT(*) as n FROM bt_tags').get().n;
if (btCount === 0) {
  const insertBt = db.prepare('INSERT OR IGNORE INTO bt_tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
  const defaultBt = [
    ['bt-covenant', '約 Covenant', '#BA7517', 0],
    ['bt-kingdom', '國度 Kingdom', '#639922', 1],
    ['bt-temple', '聖殿 Temple', '#854F0B', 2],
    ['bt-creation', '創造與新創造 Creation', '#1D9E75', 3],
    ['bt-exile', '流放與歸回 Exile', '#D85A30', 4],
    ['bt-law', '律法 Law', '#993556', 5],
    ['bt-sacrifice', '獻祭 Sacrifice', '#A32D2D', 6],
    ['bt-promise', '應許 Promise', '#534AB7', 7],
    ['bt-people', '子民 People of God', '#0F6E56', 8],
    ['bt-messiah', '彌賽亞 Messiah', '#185FA5', 9],
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertBt.run(...row);
  });
  insertMany(defaultBt);
}

const stCount = db.prepare('SELECT COUNT(*) as n FROM st_tags').get().n;
if (stCount === 0) {
  const insertSt = db.prepare('INSERT OR IGNORE INTO st_tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)');
  const defaultSt = [
    ['st-theology', '神論 Theology Proper', '#378ADD', 0],
    ['st-christology', '基督論 Christology', '#185FA5', 1],
    ['st-pneumatology', '聖靈論 Pneumatology', '#85B7EB', 2],
    ['st-anthropology', '人論 Anthropology', '#5DCAA5', 3],
    ['st-hamartiology', '罪論 Hamartiology', '#E24B4A', 4],
    ['st-soteriology', '救恩論 Soteriology', '#D85A30', 5],
    ['st-ecclesiology', '教會論 Ecclesiology', '#7F77DD', 6],
    ['st-eschatology', '末世論 Eschatology', '#D4537E', 7],
    ['st-bibliology', '聖經論 Bibliology', '#BA7517', 8],
    ['st-atonement', '贖罪 Atonement', '#993C1D', 9],
  ];
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertSt.run(...row);
  });
  insertMany(defaultSt);
}

function rebuildSearchIndex() {
  const insert = db.prepare(`INSERT INTO search_index
    (entity_type, entity_id, parent_id, title, body, ref) VALUES (?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM search_index').run();

    for (const n of db.prepare('SELECT * FROM notes').all()) {
      const book = BOOK_MAP[n.book_id];
      const ref = [n.book_id, book?.zh, book?.en, n.chapter_start, n.verse_start].filter(Boolean).join(' ');
      insert.run('note', n.id, n.id, n.title || '', n.content || '', ref);
    }
    for (const l of db.prepare(`SELECT dl.id, dl.note_id, dl.annotation, st.name
      FROM doctrine_links dl LEFT JOIN st_tags st ON st.id = dl.doctrine_id`).all()) {
      insert.run('doctrine_annotation', String(l.id), l.note_id, l.name || '教義註解', l.annotation || '', '');
    }
    for (const c of db.prepare('SELECT * FROM theme_chains').all()) {
      insert.run('theme_chain', c.id, c.id, c.name || '', c.description || '', '');
    }
    for (const r of db.prepare('SELECT * FROM resources').all()) {
      const body = [r.author, r.publication, r.pages, r.summary, r.url].filter(Boolean).join('\n');
      insert.run('resource', r.id, r.id, r.title || '', body, '');
    }
  });
  tx();
}

db.rebuildSearchIndex = rebuildSearchIndex;
rebuildSearchIndex();

module.exports = db;
