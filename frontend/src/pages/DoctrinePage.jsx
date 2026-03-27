import { useState, useMemo } from 'react';
import { BIBLE_BOOKS, BOOK_MAP, BOOK_ORDER } from '../data/bibleBooks.js';
import { Icons } from '../components/Icons.jsx';

export function DoctrinePage({ data, onNavigate }) {
  const { notes, stTags, doctrineLinks } = data;
  const [selected, setSelected] = useState(null);

  const docCounts = useMemo(() => {
    const m = {};
    (doctrineLinks || []).forEach(l => { m[l.doctrineId] = (m[l.doctrineId] || 0) + 1; });
    return m;
  }, [doctrineLinks]);

  const linkedNotes = useMemo(() => {
    if (!selected) return [];
    const links = (doctrineLinks || []).filter(l => l.doctrineId === selected);
    return links.map(l => {
      const note = notes.find(n => n.id === l.noteId);
      return note ? { ...l, note } : null;
    }).filter(Boolean).sort((a, b) => {
      const oa = BOOK_ORDER[a.note.bookId] ?? 999;
      const ob = BOOK_ORDER[b.note.bookId] ?? 999;
      if (oa !== ob) return oa - ob;
      return (parseInt(a.note.chapterStart) || 0) - (parseInt(b.note.chapterStart) || 0);
    });
  }, [selected, doctrineLinks, notes]);

  const selectedTag = stTags.find(t => t.id === selected);
  const linkedBooks = useMemo(() => [...new Set(linkedNotes.map(l => l.note.bookId))], [linkedNotes]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">系統神學教義 Doctrines</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        <div>
          {stTags.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                marginBottom: 4,
                background: selected === t.id ? "var(--st-bg)" : "transparent",
                border: selected === t.id ? "1px solid var(--st-border)" : "1px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="tag-dot" style={{ background: t.color }} />
                <span style={{ fontSize: 13, fontWeight: selected === t.id ? 600 : 400 }}>{t.name.split(" ")[0]}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{docCounts[t.id] || 0} 則連結</div>
            </div>
          ))}
        </div>

        <div>
          {!selected ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              選擇左側教義以檢視相關經文筆記
            </div>
          ) : linkedNotes.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              尚無筆記連結到此教義
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: "var(--font-zh)", fontSize: 17, fontWeight: 700, color: "var(--accent2)", marginBottom: 4 }}>
                  {selectedTag?.name}
                </h3>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)" }}>
                  <span>{linkedNotes.length} 則經文筆記</span>
                  <span>{linkedBooks.length} 卷書</span>
                  {linkedBooks.length > 0 && (
                    <span>{BOOK_MAP[linkedBooks[0]]?.zh} → {BOOK_MAP[linkedBooks[linkedBooks.length - 1]]?.zh}</span>
                  )}
                </div>
              </div>

              <div className="chain-timeline">
                {linkedNotes.map((item, i) => {
                  const prevBookId = i > 0 ? linkedNotes[i - 1].note.bookId : null;
                  const showBookHeader = item.note.bookId !== prevBookId;
                  const book = BOOK_MAP[item.note.bookId];
                  const group = BIBLE_BOOKS.find(g => g.books.some(b => b.id === item.note.bookId));
                  return (
                    <div key={item.noteId + "-" + i}>
                      {showBookHeader && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4, marginTop: i > 0 ? 14 : 0, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{book?.zh} {book?.en}</span>
                          {group && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted)" }}>{group.group.split(" ")[0]}</span>}
                        </div>
                      )}
                      <div className="chain-node" onClick={() => onNavigate("view-note", { noteId: item.note.id })}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>
                          {item.note.chapterStart && `${item.note.chapterStart}${item.note.verseStart ? `:${item.note.verseStart}` : ""}`}
                          {item.note.chapterEnd && item.note.chapterEnd !== item.note.chapterStart && `-${item.note.chapterEnd}${item.note.verseEnd ? `:${item.note.verseEnd}` : ""}`}
                          {!item.note.chapterEnd && item.note.verseEnd && item.note.verseEnd !== item.note.verseStart && `-${item.note.verseEnd}`}
                        </div>
                        {item.note.title && <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{item.note.title}</div>}
                        <div className="doctrine-link-note" style={{ marginTop: 4, fontSize: 12 }}>{item.annotation}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
