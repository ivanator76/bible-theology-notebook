import { useState, useEffect, useMemo, useRef } from 'react';
import { BOOK_MAP } from '../data/bibleBooks.js';
import { getBookRef } from '../utils/getBookRef.js';
import { Icons } from './Icons.jsx';

export function GlobalSearch({ data, onNavigate, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return { notes: [], resources: [], doctrines: [], chains: [] };
    const q = query.toLowerCase();

    const notes = data.notes.filter(n => {
      const book = BOOK_MAP[n.bookId];
      const ref = book ? `${book.zh} ${book.en}` : "";
      return ref.toLowerCase().includes(q) || (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
    }).slice(0, 8);

    const resources = (data.resources || []).filter(r =>
      (r.title || "").toLowerCase().includes(q) || (r.author || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q) || (r.summary || "").toLowerCase().includes(q)
    ).slice(0, 5);

    const doctrines = data.stTags.filter(t => t.name.toLowerCase().includes(q));
    const btMatches = data.btTags.filter(t => t.name.toLowerCase().includes(q));

    const chains = (data.themeChains || []).filter(c =>
      c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)
    ).slice(0, 5);

    return { notes, resources, doctrines: [...doctrines, ...btMatches], chains };
  }, [query, data]);

  const hasResults = results.notes.length + results.resources.length + results.doctrines.length + results.chains.length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }} onClick={onClose}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 560, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow2)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <Icons.Search />
          <input ref={inputRef} style={{ flex: 1, border: "none", outline: "none", fontSize: 16, background: "transparent", color: "var(--text)" }}
            placeholder="搜尋筆記、資料、教義、追蹤鏈..." value={query} onChange={e => setQuery(e.target.value)} />
          <button className="btn-ghost" onClick={onClose}><Icons.X /></button>
        </div>

        {query.length >= 2 && (
          <div style={{ maxHeight: 400, overflowY: "auto", padding: 8 }}>
            {!hasResults && <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>沒有找到相關結果</div>}

            {results.notes.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>筆記 ({results.notes.length})</div>
                {results.notes.map(n => (
                  <div key={n.id} onClick={() => { onNavigate("view-note", { noteId: n.id }); onClose(); }} style={{ padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</div>
                    {n.title && <div style={{ fontSize: 12, color: "var(--text)" }}>{n.title}</div>}
                  </div>
                ))}
              </div>
            )}

            {results.chains.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>追蹤鏈 ({results.chains.length})</div>
                {results.chains.map(c => (
                  <div key={c.id} onClick={() => { onNavigate("chains", { chainId: c.id }); onClose(); }} style={{ padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{c.name}</div>
                  </div>
                ))}
              </div>
            )}

            {results.doctrines.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>標籤/教義 ({results.doctrines.length})</div>
                {results.doctrines.map(t => (
                  <div key={t.id} onClick={() => { onNavigate(t.id.startsWith("st-") ? "doctrines" : "notes"); onClose(); }} style={{ padding: "6px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: 6, transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span className="tag-dot" style={{ background: t.color }} /><span style={{ fontSize: 13 }}>{t.name}</span>
                  </div>
                ))}
              </div>
            )}

            {results.resources.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>外部資料 ({results.resources.length})</div>
                {results.resources.map(r => (
                  <div key={r.id} onClick={() => { onNavigate("resources"); onClose(); }} style={{ padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{r.title}</div>
                    {r.author && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.author}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
