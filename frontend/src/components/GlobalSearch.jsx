import { useState, useEffect, useMemo, useRef } from 'react';
import { BOOK_MAP } from '../data/bibleBooks.js';
import { getBookRef } from '../utils/getBookRef.js';
import { Icons } from './Icons.jsx';

// Build a short snippet around the first query match, with the match highlighted.
function Snippet({ text, query }) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - 24);
  const end = Math.min(text.length, idx + query.length + 40);
  const before = (start > 0 ? '…' : '') + text.slice(start, idx);
  const hit = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length, end) + (end < text.length ? '…' : '');
  return (
    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
      {before}<mark style={{ background: 'var(--accent-light)', color: 'var(--accent2)', fontWeight: 600, padding: '0 1px', borderRadius: 2 }}>{hit}</mark>{after}
    </div>
  );
}

export function GlobalSearch({ data, onNavigate, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

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

  // Flatten every result row into one ordered list so arrow keys can walk it.
  const items = useMemo(() => {
    const list = [];
    results.notes.forEach(n => list.push({ type: 'note', activate: () => { onNavigate("view-note", { noteId: n.id }); onClose(); } }));
    results.chains.forEach(c => list.push({ type: 'chain', activate: () => { onNavigate("chains", { chainId: c.id }); onClose(); } }));
    results.doctrines.forEach(t => list.push({ type: 'doctrine', activate: () => { onNavigate(t.id.startsWith("st-") ? "doctrines" : "notes"); onClose(); } }));
    results.resources.forEach(() => list.push({ type: 'resource', activate: () => { onNavigate("resources"); onClose(); } }));
    return list;
  }, [results, onNavigate, onClose]);

  const hasResults = items.length > 0;

  useEffect(() => { setSelected(0); }, [query]);
  useEffect(() => {
    itemRefs.current[selected]?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); items[selected]?.activate(); }
    else if (e.key === "Escape") { onClose(); }
  };

  const q = query.toLowerCase();
  let flatIndex = 0;
  const rowProps = (isSel) => ({
    ref: el => { itemRefs.current[isSel.i] = el; },
    onMouseEnter: () => setSelected(isSel.i),
    style: {
      padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)",
      background: selected === isSel.i ? "var(--accent-light)" : "transparent",
    },
  });

  const sectionTitle = (label, n) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label} ({n})</div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }} onClick={onClose}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 560, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow2)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <Icons.Search />
          <input ref={inputRef} onKeyDown={onKeyDown} style={{ flex: 1, border: "none", outline: "none", fontSize: 16, background: "transparent", color: "var(--text)" }}
            placeholder="搜尋筆記、資料、教義、追蹤鏈..." value={query} onChange={e => setQuery(e.target.value)} />
          <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>↑↓ 選擇 · ⏎ 開啟</span>
          <button className="btn-ghost" onClick={onClose}><Icons.X /></button>
        </div>

        {query.length >= 2 && (
          <div style={{ maxHeight: 400, overflowY: "auto", padding: 8 }}>
            {!hasResults && <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>沒有找到相關結果</div>}

            {results.notes.length > 0 && (
              <div>
                {sectionTitle("筆記", results.notes.length)}
                {results.notes.map(n => {
                  const isSel = { i: flatIndex++ };
                  return (
                    <div key={n.id} {...rowProps(isSel)} onClick={items[isSel.i].activate}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</div>
                      {n.title && <div style={{ fontSize: 12, color: "var(--text)" }}>{n.title}</div>}
                      <Snippet text={n.content} query={q} />
                    </div>
                  );
                })}
              </div>
            )}

            {results.chains.length > 0 && (
              <div>
                {sectionTitle("追蹤鏈", results.chains.length)}
                {results.chains.map(c => {
                  const isSel = { i: flatIndex++ };
                  return (
                    <div key={c.id} {...rowProps(isSel)} onClick={items[isSel.i].activate}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{c.name}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {results.doctrines.length > 0 && (
              <div>
                {sectionTitle("標籤/教義", results.doctrines.length)}
                {results.doctrines.map(t => {
                  const isSel = { i: flatIndex++ };
                  return (
                    <div key={t.id} {...rowProps(isSel)} onClick={items[isSel.i].activate}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="tag-dot" style={{ background: t.color }} /><span style={{ fontSize: 13 }}>{t.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {results.resources.length > 0 && (
              <div>
                {sectionTitle("外部資料", results.resources.length)}
                {results.resources.map(r => {
                  const isSel = { i: flatIndex++ };
                  return (
                    <div key={r.id} {...rowProps(isSel)} onClick={items[isSel.i].activate}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{r.title}</div>
                      {r.author && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.author}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
