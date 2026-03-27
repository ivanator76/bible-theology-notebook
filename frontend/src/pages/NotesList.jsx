import { useState, useMemo } from 'react';
import { BIBLE_BOOKS, BOOK_MAP } from '../data/bibleBooks.js';
import { getBookRef } from '../utils/getBookRef.js';
import { Icons } from '../components/Icons.jsx';
import { TagPill } from '../components/TagPill.jsx';

export function NotesList({ data, onNavigate, initialFilter }) {
  const { notes, btTags, stTags } = data;
  const [search, setSearch] = useState("");
  const [filterBook, setFilterBook] = useState(initialFilter?.filterBook || "");
  const [filterTag, setFilterTag] = useState("");

  const filtered = useMemo(() => {
    let list = [...notes].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    if (filterBook) list = list.filter(n => n.bookId === filterBook);
    if (filterTag) list = list.filter(n => (n.btTags || []).includes(filterTag) || (n.stTags || []).includes(filterTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => {
        const book = BOOK_MAP[n.bookId];
        const ref = book ? `${book.zh} ${book.en}` : "";
        return (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q) || ref.toLowerCase().includes(q);
      });
    }
    return list;
  }, [notes, filterBook, filterTag, search]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">筆記 Notes</h2>
        <button className="btn btn-primary" onClick={() => onNavigate("new-note")}>
          <Icons.Plus /> 新增筆記
        </button>
      </div>

      <div className="search-box">
        <Icons.Search />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋筆記..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="select" style={{ width: "auto", minWidth: 160 }} value={filterBook} onChange={e => setFilterBook(e.target.value)}>
          <option value="">所有書卷</option>
          {BIBLE_BOOKS.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.books.map(b => <option key={b.id} value={b.id}>{b.zh} {b.en}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="select" style={{ width: "auto", minWidth: 160 }} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="">所有標籤</option>
          <optgroup label="聖經神學 Biblical">
            {btTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </optgroup>
          <optgroup label="系統神學 Systematic">
            {stTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </optgroup>
        </select>
        {(filterBook || filterTag) && (
          <button className="btn btn-sm btn-ghost" onClick={() => { setFilterBook(""); setFilterTag(""); }}>
            <Icons.X /> 清除篩選
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><Icons.FileText /></div>
          <div>{notes.length === 0 ? "尚無筆記" : "沒有符合條件的筆記"}</div>
          {notes.length === 0 && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onNavigate("new-note")}><Icons.Plus /> 新增第一則筆記</button>}
        </div>
      ) : (
        filtered.map(n => (
          <div key={n.id} className="note-card" onClick={() => onNavigate("view-note", { noteId: n.id })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="note-ref">{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</div>
                {n.title && <div className="note-title">{n.title}</div>}
              </div>
              <div className="note-meta">{new Date(n.updatedAt || n.createdAt).toLocaleDateString("zh-TW")}</div>
            </div>
            <div className="note-preview">{(n.content || "").replace(/[#*>`-]/g, "").slice(0, 120)}</div>
            <div className="note-tags">
              {(n.btTags || []).map(id => {
                const tag = btTags.find(t => t.id === id);
                return tag ? <TagPill key={id} tag={tag} type="bt" /> : null;
              })}
              {(n.stTags || []).map(id => {
                const tag = stTags.find(t => t.id === id);
                return tag ? <TagPill key={id} tag={tag} type="st" /> : null;
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
