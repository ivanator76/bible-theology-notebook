import { useState, useMemo } from 'react';
import { BIBLE_BOOKS, BOOK_MAP, BOOK_ORDER } from '../data/bibleBooks.js';
import { getBookRef } from '../utils/getBookRef.js';
import { Icons } from '../components/Icons.jsx';
import { TagPill } from '../components/TagPill.jsx';
import { NetworkGraph } from '../components/NetworkGraph.jsx';

export function Dashboard({ data, onNavigate }) {
  const { notes, btTags, stTags, doctrineLinks } = data;
  const totalBooks = new Set(notes.map(n => n.bookId)).size;

  const btCounts = useMemo(() => {
    const m = {};
    btTags.forEach(t => { m[t.id] = 0; });
    notes.forEach(n => (n.btTags || []).forEach(id => { m[id] = (m[id] || 0) + 1; }));
    return btTags.map(t => ({ ...t, count: m[t.id] || 0 })).sort((a, b) => b.count - a.count);
  }, [notes, btTags]);

  const stCounts = useMemo(() => {
    const m = {};
    stTags.forEach(t => { m[t.id] = 0; });
    (doctrineLinks || []).forEach(l => { m[l.doctrineId] = (m[l.doctrineId] || 0) + 1; });
    return stTags.map(t => ({ ...t, count: m[t.id] || 0 })).sort((a, b) => b.count - a.count);
  }, [doctrineLinks, stTags]);

  const [chartTab, setChartTab] = useState("bt");
  const chartData = chartTab === "bt" ? btCounts : stCounts;
  const maxCount = Math.max(1, ...chartData.map(d => d.count));

  const bookNoteMap = useMemo(() => {
    const m = {};
    notes.forEach(n => {
      if (!m[n.bookId]) m[n.bookId] = new Set();
      if (n.chapterStart) {
        const end = n.chapterEnd || n.chapterStart;
        for (let c = parseInt(n.chapterStart); c <= parseInt(end); c++) m[n.bookId].add(c);
      }
    });
    return m;
  }, [notes]);

  const recentNotes = useMemo(() =>
    [...notes].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)).slice(0, 6),
    [notes]
  );

  const [expandedTag, setExpandedTag] = useState(null);
  const [expandedBook, setExpandedBook] = useState(null);

  const expandedBookNotes = useMemo(() => {
    if (!expandedBook) return {};
    const byChapter = {};
    notes.forEach(n => {
      if (n.bookId !== expandedBook) return;
      const chStart = parseInt(n.chapterStart) || 0;
      const chEnd = parseInt(n.chapterEnd || n.chapterStart) || chStart;
      for (let c = chStart; c <= chEnd; c++) {
        if (!byChapter[c]) byChapter[c] = [];
        byChapter[c].push(n);
      }
    });
    return byChapter;
  }, [expandedBook, notes]);

  const expandedNotes = useMemo(() => {
    if (!expandedTag) return [];
    if (chartTab === "bt") {
      return notes.filter(n => (n.btTags || []).includes(expandedTag))
        .sort((a, b) => BOOK_ORDER[a.bookId] - BOOK_ORDER[b.bookId]);
    } else {
      const linkedNoteIds = (doctrineLinks || []).filter(l => l.doctrineId === expandedTag).map(l => l.noteId);
      return notes.filter(n => linkedNoteIds.includes(n.id))
        .sort((a, b) => BOOK_ORDER[a.bookId] - BOOK_ORDER[b.bookId]);
    }
  }, [expandedTag, chartTab, notes, doctrineLinks]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dashboard 總覽</h2>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{notes.length}</div>
          <div className="stat-label">筆記 Notes</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalBooks}</div>
          <div className="stat-label">涵蓋書卷 Books</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{(data.resources || []).length}</div>
          <div className="stat-label">外部資料 Resources</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{(data.themeChains || []).length}</div>
          <div className="stat-label">追蹤鏈 Chains</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-title"><Icons.Tag />主題分布 Topic distribution</div>
          <div className="tab-row">
            <div className={`tab ${chartTab === "bt" ? "active" : ""}`} onClick={() => { setChartTab("bt"); setExpandedTag(null); }}>聖經神學</div>
            <div className={`tab ${chartTab === "st" ? "active" : ""}`} onClick={() => { setChartTab("st"); setExpandedTag(null); }}>系統神學</div>
          </div>
          {chartData.filter(d => d.count > 0).length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>尚無資料</div>
          ) : (
            chartData.filter(d => d.count > 0).map(d => (
              <div key={d.id}>
                <div className="chart-bar-row" onClick={() => setExpandedTag(expandedTag === d.id ? null : d.id)} style={{ cursor: "pointer", borderRadius: "var(--radius-sm)", padding: "3px 0", background: expandedTag === d.id ? "var(--accent-light)" : "transparent" }}>
                  <div className="chart-bar-label" style={{ fontWeight: expandedTag === d.id ? 600 : 400 }}>{d.name.split(" ")[0]}</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%`, background: d.color }} />
                  </div>
                  <div className="chart-bar-count">{d.count}</div>
                </div>
                {expandedTag === d.id && expandedNotes.length > 0 && (
                  <div style={{ marginLeft: 128, marginBottom: 8, paddingLeft: 8, borderLeft: `3px solid ${d.color}` }}>
                    {expandedNotes.map(n => (
                      <div key={n.id} onClick={() => onNavigate("view-note", { noteId: n.id })} style={{ padding: "5px 8px", fontSize: 13, cursor: "pointer", borderRadius: "var(--radius-sm)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ color: "var(--accent2)", fontWeight: 500 }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</span>
                        {n.title && <span style={{ color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title"><Icons.Book />研究進度 Study progress</div>
          <div style={{ maxHeight: expandedBook ? 400 : 280, overflowY: "auto" }}>
            {BIBLE_BOOKS.map(g => (
              <div key={g.group}>
                <div className="group-label">{g.group}</div>
                <div className="progress-grid">
                  {g.books.map(b => {
                    const chapters = bookNoteMap[b.id];
                    const hasNotes = chapters && chapters.size > 0;
                    const ratio = hasNotes ? chapters.size / b.ch : 0;
                    const isExpanded = expandedBook === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`progress-cell ${hasNotes ? "has-notes" : ""}`}
                        style={{
                          ...(hasNotes ? { opacity: 0.4 + ratio * 0.6 } : {}),
                          ...(isExpanded ? { outline: "2px solid var(--accent)", outlineOffset: 1 } : {}),
                        }}
                        title={`${b.zh} ${b.en} — ${hasNotes ? `${chapters.size}/${b.ch} 章` : "尚無筆記"}`}
                        onClick={() => setExpandedBook(isExpanded ? null : b.id)}
                      />
                    );
                  })}
                </div>
                {g.books.some(b => expandedBook === b.id) && (() => {
                  const b = BOOK_MAP[expandedBook];
                  const chapters = bookNoteMap[expandedBook];
                  return (
                    <div style={{ margin: "8px 0 12px", padding: 12, background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)" }}>{b.zh} {b.en}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{chapters ? chapters.size : 0}/{b.ch} 章有筆記</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
                        {Array.from({ length: b.ch }, (_, i) => i + 1).map(ch => {
                          const hasNote = chapters && chapters.has(ch);
                          const chNotes = expandedBookNotes[ch] || [];
                          return (
                            <div key={ch} style={{
                              width: 22, height: 22, borderRadius: 3,
                              background: hasNote ? "var(--accent)" : "var(--surface2)",
                              border: `1px solid ${hasNote ? "var(--accent2)" : "var(--border)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, color: hasNote ? "#fff" : "var(--muted)",
                              cursor: hasNote ? "pointer" : "default",
                              fontWeight: hasNote ? 600 : 400, opacity: hasNote ? 1 : 0.6,
                            }} title={hasNote ? `第 ${ch} 章：${chNotes.length} 則筆記` : `第 ${ch} 章：尚無筆記`}>{ch}</div>
                          );
                        })}
                      </div>
                      {Object.keys(expandedBookNotes).length > 0 && (
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, maxHeight: 160, overflowY: "auto" }}>
                          {Object.entries(expandedBookNotes).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([ch, chNotes]) => (
                            <div key={ch}>
                              {chNotes.map(n => (
                                <div key={n.id} onClick={() => onNavigate("view-note", { noteId: n.id })} style={{ padding: "4px 8px", fontSize: 12, cursor: "pointer", borderRadius: "var(--radius-sm)" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <span style={{ color: "var(--accent2)", fontWeight: 500 }}>
                                    {n.chapterStart}{n.verseStart ? `:${n.verseStart}` : ""}{n.chapterEnd && n.chapterEnd !== n.chapterStart ? `-${n.chapterEnd}${n.verseEnd ? `:${n.verseEnd}` : ""}` : n.verseEnd && n.verseEnd !== n.verseStart ? `-${n.verseEnd}` : ""}
                                  </span>
                                  {n.title && <span style={{ color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {(data.themeChains || []).length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}><Icons.Layers />主題追蹤鏈 Theme chains</div>
            <button className="btn btn-sm" onClick={() => onNavigate("chains")}>查看全部</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
            {(data.themeChains || []).map(chain => {
              const chainN = (chain.noteIds || []).map(id => notes.find(n => n.id === id)).filter(Boolean);
              const books = [...new Set(chainN.map(n => n.bookId))];
              const linkedTag = btTags.find(t => t.id === chain.btTagId);
              const firstBook = books.length > 0 ? BOOK_MAP[books[0]] : null;
              const lastBook = books.length > 0 ? BOOK_MAP[books[books.length - 1]] : null;
              return (
                <div key={chain.id} className="chain-card-mini" onClick={() => onNavigate("chains", { chainId: chain.id })}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)" }}>{chain.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{chainN.length} 則筆記 · {books.length} 卷書</div>
                  {firstBook && lastBook && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>{firstBook.zh} → {lastBook.zh}</div>}
                  {linkedTag && <div style={{ marginTop: 4 }}><TagPill tag={linkedTag} type="bt" /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title"><Icons.FileText />最近編輯 Recent notes</div>
        {recentNotes.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13, padding: "16px 0", textAlign: "center" }}>尚無筆記，點擊「新增筆記」開始研究</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {recentNotes.map(n => (
              <div key={n.id} className="note-card" onClick={() => onNavigate("view-note", { noteId: n.id })}>
                <div className="note-ref">{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</div>
                {n.title && <div className="note-title">{n.title}</div>}
                <div className="note-tags">
                  {(n.btTags || []).slice(0, 3).map(id => {
                    const tag = btTags.find(t => t.id === id);
                    return tag ? <TagPill key={id} tag={tag} type="bt" /> : null;
                  })}
                </div>
                <div className="note-meta">{new Date(n.updatedAt || n.createdAt).toLocaleDateString("zh-TW")}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title"><Icons.Chain />關聯網絡圖 Network graph</div>
        <NetworkGraph data={data} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
