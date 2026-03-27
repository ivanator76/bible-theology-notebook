import { useState, useMemo } from 'react';
import { BIBLE_BOOKS, BOOK_MAP, BOOK_ORDER } from '../data/bibleBooks.js';
import { getBookRef } from '../utils/getBookRef.js';
import { uid } from '../utils/uid.js';
import { Icons } from '../components/Icons.jsx';
import { TagPill } from '../components/TagPill.jsx';

export function ThemeChainPage({ data, onUpdate, onNavigate, initialChainId }) {
  const { themeChains = [], notes, btTags } = data;
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", btTagId: "" });
  const [addingNote, setAddingNote] = useState(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [selected, setSelected] = useState(initialChainId || null);

  const resetForm = () => setForm({ name: "", description: "", btTagId: "" });
  const startNew = () => { resetForm(); setEditing("new"); };
  const startEdit = (chain) => { setForm({ name: chain.name, description: chain.description || "", btTagId: chain.btTagId || "" }); setEditing(chain.id); };

  const save = () => {
    if (!form.name.trim()) return alert("請輸入追蹤鏈名稱");
    const id = editing === "new" ? uid() : editing;
    const existing = themeChains.find(c => c.id === id);
    const chain = {
      id, name: form.name.trim(), description: form.description.trim(),
      btTagId: form.btTagId, noteIds: existing?.noteIds || [],
      createdAt: existing?.createdAt || Date.now(), updatedAt: Date.now(),
    };
    const newChains = editing === "new" ? [...themeChains, chain] : themeChains.map(c => c.id === id ? chain : c);
    onUpdate({ ...data, themeChains: newChains });
    setEditing(null); setSelected(id); resetForm();
  };

  const remove = (chainId) => {
    if (!confirm("確定刪除此追蹤鏈？筆記本身不會被刪除。")) return;
    onUpdate({ ...data, themeChains: themeChains.filter(c => c.id !== chainId) });
    if (selected === chainId) setSelected(null);
  };

  const addNoteToChain = (chainId, noteId) => {
    const newChains = themeChains.map(c => {
      if (c.id !== chainId || c.noteIds.includes(noteId)) return c;
      return { ...c, noteIds: [...c.noteIds, noteId], updatedAt: Date.now() };
    });
    onUpdate({ ...data, themeChains: newChains });
  };

  const removeNoteFromChain = (chainId, noteId) => {
    const newChains = themeChains.map(c => {
      if (c.id !== chainId) return c;
      return { ...c, noteIds: c.noteIds.filter(id => id !== noteId), updatedAt: Date.now() };
    });
    onUpdate({ ...data, themeChains: newChains });
  };

  const selectedChain = selected ? themeChains.find(c => c.id === selected) : null;

  const chainNotes = useMemo(() => {
    if (!selectedChain) return [];
    return selectedChain.noteIds
      .map(id => notes.find(n => n.id === id)).filter(Boolean)
      .sort((a, b) => {
        const oa = BOOK_ORDER[a.bookId] ?? 999;
        const ob = BOOK_ORDER[b.bookId] ?? 999;
        if (oa !== ob) return oa - ob;
        return (parseInt(a.chapterStart) || 0) - (parseInt(b.chapterStart) || 0);
      });
  }, [selectedChain, notes]);

  const availableNotes = useMemo(() => {
    if (!selectedChain) return [];
    const inChain = new Set(selectedChain.noteIds);
    let list = notes.filter(n => !inChain.has(n.id));
    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase();
      list = list.filter(n => {
        const book = BOOK_MAP[n.bookId];
        const ref = book ? `${book.zh} ${book.en}` : "";
        return ref.toLowerCase().includes(q) || (n.title || "").toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => BOOK_ORDER[a.bookId] - BOOK_ORDER[b.bookId]);
  }, [selectedChain, notes, noteSearch]);

  const chainBooks = useMemo(() => {
    if (!chainNotes.length) return [];
    return [...new Set(chainNotes.map(n => n.bookId))];
  }, [chainNotes]);

  if (editing) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={() => { setEditing(null); resetForm(); }}><Icons.Back /></button>
            <h2 className="page-title">{editing === "new" ? "新增主題追蹤鏈" : "編輯追蹤鏈"}</h2>
          </div>
          <button className="btn btn-primary" onClick={save}>儲存</button>
        </div>
        <div className="card">
          <div className="field">
            <label className="label">追蹤鏈名稱</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：約的發展 Development of Covenant" />
          </div>
          <div className="field">
            <label className="label">關聯的聖經神學主題（可選）</label>
            <select className="select" value={form.btTagId} onChange={e => setForm({ ...form, btTagId: e.target.value })}>
              <option value="">不關聯特定主題</option>
              {btTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">描述 / 研究問題</label>
            <textarea className="textarea" style={{ minHeight: 80 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="此追蹤鏈要回答什麼問題？追蹤什麼主題的發展？" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">主題追蹤鏈 Theme chains</h2>
        <button className="btn btn-primary" onClick={startNew}><Icons.Plus /> 新增追蹤鏈</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
        <div>
          {themeChains.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: 20, textAlign: "center" }}>尚無追蹤鏈</div>
          ) : (
            themeChains.map(chain => {
              const chainN = chain.noteIds.map(id => notes.find(n => n.id === id)).filter(Boolean);
              const books = [...new Set(chainN.map(n => n.bookId))];
              const linkedTag = btTags.find(t => t.id === chain.btTagId);
              return (
                <div key={chain.id} onClick={() => { setSelected(chain.id); setAddingNote(null); }}
                  style={{ padding: "12px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer", marginBottom: 4,
                    background: selected === chain.id ? "var(--accent-light)" : "transparent",
                    border: selected === chain.id ? "1px solid var(--accent)" : "1px solid transparent",
                    transition: "all 0.15s" }}>
                  <div style={{ fontSize: 14, fontWeight: selected === chain.id ? 600 : 400, color: "var(--accent2)" }}>{chain.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{chainN.length} 則筆記 · {books.length} 卷書</div>
                  {linkedTag && <div style={{ marginTop: 4 }}><TagPill tag={linkedTag} type="bt" /></div>}
                </div>
              );
            })
          )}
        </div>

        <div>
          {!selectedChain ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {themeChains.length === 0 ? "建立你的第一條追蹤鏈，開始追蹤聖經主題的發展脈絡" : "選擇左側追蹤鏈以檢視"}
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-zh)", fontSize: 18, fontWeight: 700, color: "var(--accent2)" }}>{selectedChain.name}</h3>
                    {selectedChain.description && <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>{selectedChain.description}</p>}
                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                      <span>{chainNotes.length} 則筆記</span>
                      <span>{chainBooks.length} 卷書</span>
                      <span>{chainBooks.length > 0 && `${BOOK_MAP[chainBooks[0]]?.zh || ""} → ${BOOK_MAP[chainBooks[chainBooks.length - 1]]?.zh || ""}`}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => startEdit(selectedChain)}><Icons.Edit /> 編輯</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(selectedChain.id)}><Icons.Trash /></button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>正典順序時間線</span>
                <button className="btn btn-sm" onClick={() => { setAddingNote(addingNote ? null : selectedChain.id); setNoteSearch(""); }}>
                  {addingNote ? "收合" : <><Icons.Plus /> 加入筆記</>}
                </button>
              </div>

              {addingNote === selectedChain.id && (
                <div style={{ marginBottom: 16, background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div className="search-box" style={{ marginBottom: 8 }}>
                    <Icons.Search />
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋筆記..." value={noteSearch} onChange={e => setNoteSearch(e.target.value)} />
                  </div>
                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    {availableNotes.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 12 }}>
                        {notes.length === 0 ? "尚無筆記" : "沒有可加入的筆記"}
                      </div>
                    ) : (
                      availableNotes.slice(0, 30).map(n => (
                        <div key={n.id} onClick={() => addNoteToChain(selectedChain.id, n.id)}
                          style={{ padding: "6px 8px", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 2, transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent2)" }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</span>
                          {n.title && <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {chainNotes.length === 0 ? (
                <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 32 }}>
                  此追蹤鏈尚無筆記，點擊「加入筆記」開始建構
                </div>
              ) : (
                <div className="chain-timeline">
                  {chainNotes.map((n, i) => {
                    const book = BOOK_MAP[n.bookId];
                    const prevBook = i > 0 ? chainNotes[i - 1].bookId : null;
                    const showGroupHeader = n.bookId !== prevBook;
                    return (
                      <div key={n.id}>
                        {showGroupHeader && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4, marginTop: i > 0 ? 12 : 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {book?.zh} {book?.en}
                          </div>
                        )}
                        <div className="chain-node" onClick={() => onNavigate("view-note", { noteId: n.id })}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>
                                {n.chapterStart && `${n.chapterStart}${n.verseStart ? `:${n.verseStart}` : ""}`}
                                {n.chapterEnd && n.chapterEnd !== n.chapterStart && `-${n.chapterEnd}${n.verseEnd ? `:${n.verseEnd}` : ""}`}
                                {!n.chapterEnd && n.verseEnd && n.verseEnd !== n.verseStart && `-${n.verseEnd}`}
                              </div>
                              {n.title && <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{n.title}</div>}
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {(n.content || "").replace(/[#*>`\-]/g, "").slice(0, 100)}
                              </div>
                            </div>
                            <button className="btn-ghost" onClick={e => { e.stopPropagation(); removeNoteFromChain(selectedChain.id, n.id); }} title="從追蹤鏈移除" style={{ color: "var(--danger)", flexShrink: 0 }}><Icons.X /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
