import { useState, useMemo } from 'react';
import { BOOK_MAP, BOOK_ORDER } from '../data/bibleBooks.js';
import { getBookRef } from '../utils/getBookRef.js';
import { uid } from '../utils/uid.js';
import { parseMarkdown } from '../utils/parseMarkdown.js';
import { Icons } from '../components/Icons.jsx';
import { TagPill } from '../components/TagPill.jsx';
import { RESOURCE_TYPES } from '../data/resourceTypes.js';
import { ScripturePanel } from '../components/ScripturePanel.jsx';
import { AiPanel } from '../components/AiPanel.jsx';

function CrossRefAnnotation({ targetNote, onConfirm, onCancel }) {
  const [annotation, setAnnotation] = useState("");
  if (!targetNote) return null;
  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        引用目標：<span style={{ fontWeight: 600, color: "var(--accent2)" }}>
          {getBookRef(targetNote.bookId, targetNote.chapterStart, targetNote.chapterEnd, targetNote.verseStart, targetNote.verseEnd)}
          {targetNote.title ? ` — ${targetNote.title}` : ""}
        </span>
      </div>
      <div className="field">
        <label className="label">引用說明（可選）</label>
        <input className="input" value={annotation} onChange={e => setAnnotation(e.target.value)}
          placeholder="例：此處的羔羊意象與出埃及記 12 章互相呼應"
          onKeyDown={e => e.key === "Enter" && onConfirm(annotation)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onConfirm(annotation)}>建立引用</button>
        <button className="btn btn-sm" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

export function NoteView({ data, noteId, onNavigate, onDelete, onUpdate }) {
  const note = data.notes.find(n => n.id === noteId);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [resSearch, setResSearch] = useState("");
  const [showCrossRefPicker, setShowCrossRefPicker] = useState(false);
  const [crossRefSearch, setCrossRefSearch] = useState("");
  const [crossRefNote, setCrossRefNote] = useState("");

  if (!note) return <div className="empty">找不到此筆記</div>;

  const docLinks = (data.doctrineLinks || []).filter(l => l.noteId === noteId);

  const linkedResources = useMemo(() => {
    const resIds = (data.resourceLinks || []).filter(l => l.noteId === noteId).map(l => l.resourceId);
    return (data.resources || []).filter(r => resIds.includes(r.id));
  }, [data.resourceLinks, data.resources, noteId]);

  const unlinkedResources = useMemo(() => {
    const linkedIds = (data.resourceLinks || []).filter(l => l.noteId === noteId).map(l => l.resourceId);
    let list = (data.resources || []).filter(r => !linkedIds.includes(r.id));
    if (resSearch.trim()) {
      const q = resSearch.toLowerCase();
      list = list.filter(r => (r.title || "").toLowerCase().includes(q) || (r.author || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q));
    }
    return list;
  }, [data.resources, data.resourceLinks, noteId, resSearch]);

  const linkResource = (resourceId) => {
    onUpdate({ ...data, resourceLinks: [...(data.resourceLinks || []), { noteId, resourceId }] });
  };
  const unlinkResource = (resourceId) => {
    onUpdate({ ...data, resourceLinks: (data.resourceLinks || []).filter(l => !(l.noteId === noteId && l.resourceId === resourceId)) });
  };

  const crossRefs = useMemo(() => {
    const refs = (data.crossRefs || []).filter(r => r.fromId === noteId || r.toId === noteId);
    return refs.map(r => {
      const otherId = r.fromId === noteId ? r.toId : r.fromId;
      const otherNote = data.notes.find(n => n.id === otherId);
      const direction = r.fromId === noteId ? "out" : "in";
      return otherNote ? { ...r, otherNote, direction } : null;
    }).filter(Boolean).sort((a, b) => BOOK_ORDER[a.otherNote.bookId] - BOOK_ORDER[b.otherNote.bookId]);
  }, [data.crossRefs, data.notes, noteId]);

  const availableCrossRefNotes = useMemo(() => {
    const linkedIds = new Set(crossRefs.map(r => r.otherNote.id));
    linkedIds.add(noteId);
    let list = data.notes.filter(n => !linkedIds.has(n.id));
    if (crossRefSearch.trim()) {
      const q = crossRefSearch.toLowerCase();
      list = list.filter(n => {
        const book = BOOK_MAP[n.bookId];
        const ref = book ? `${book.zh} ${book.en}` : "";
        return ref.toLowerCase().includes(q) || (n.title || "").toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => BOOK_ORDER[a.bookId] - BOOK_ORDER[b.bookId]);
  }, [data.notes, crossRefs, noteId, crossRefSearch]);

  const addCrossRef = (toNoteId, annotation) => {
    const newRef = { id: uid(), fromId: noteId, toId: toNoteId, annotation: annotation || "", createdAt: Date.now() };
    onUpdate({ ...data, crossRefs: [...(data.crossRefs || []), newRef] });
    setShowCrossRefPicker(false);
    setCrossRefNote("");
    setCrossRefSearch("");
  };
  const removeCrossRef = (refId) => {
    onUpdate({ ...data, crossRefs: (data.crossRefs || []).filter(r => r.id !== refId) });
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" onClick={() => onNavigate("notes")}><Icons.Back /></button>
          <h2 className="page-title">筆記詳情</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => onNavigate("edit-note", { noteId: note.id })}><Icons.Edit /> 編輯</button>
          <button className="btn btn-danger" onClick={() => { if (confirm("確定刪除此筆記？")) onDelete(note.id); }}><Icons.Trash /> 刪除</button>
        </div>
      </div>

      <div className="card">
        <div className="note-ref" style={{ fontSize: 20, marginBottom: 4 }}>
          {getBookRef(note.bookId, note.chapterStart, note.chapterEnd, note.verseStart, note.verseEnd)}
        </div>
        {note.title && <h3 style={{ fontFamily: "var(--font-zh)", fontSize: 17, marginBottom: 12, color: "var(--text)" }}>{note.title}</h3>}
        <div className="note-tags" style={{ marginBottom: 16 }}>
          {(note.btTags || []).map(id => { const tag = data.btTags.find(t => t.id === id); return tag ? <TagPill key={id} tag={tag} type="bt" /> : null; })}
          {(note.stTags || []).map(id => { const tag = data.stTags.find(t => t.id === id); return tag ? <TagPill key={id} tag={tag} type="st" /> : null; })}
        </div>
        <div className="md-preview" dangerouslySetInnerHTML={{ __html: parseMarkdown(note.content) }} />
        <div className="note-meta" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          建立：{new Date(note.createdAt).toLocaleString("zh-TW")}
          {note.updatedAt && note.updatedAt !== note.createdAt && <span> ｜ 更新：{new Date(note.updatedAt).toLocaleString("zh-TW")}</span>}
        </div>
      </div>

      <ScripturePanel
        bookId={note.bookId}
        chapterStart={note.chapterStart}
        chapterEnd={note.chapterEnd}
        verseStart={note.verseStart}
        verseEnd={note.verseEnd}
        collapsible={true}
      />

      {docLinks.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title"><Icons.Link /> 系統神學教義連結</div>
          {docLinks.map((l, i) => {
            const doc = data.stTags.find(t => t.id === l.doctrineId);
            return (
              <div key={i} className="doctrine-link-card">
                <div className="doctrine-link-tag">{doc ? doc.name : l.doctrineId}</div>
                <div className="doctrine-link-note">{l.annotation}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}><Icons.Globe /> 外部資料 ({linkedResources.length})</div>
          <button className="btn btn-sm" onClick={() => { setShowLinkPicker(!showLinkPicker); setResSearch(""); }}>
            {showLinkPicker ? "收合" : <><Icons.Plus /> 連結資料</>}
          </button>
        </div>
        {linkedResources.length === 0 && !showLinkPicker && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>尚無連結的外部資料</div>
        )}
        {linkedResources.map(r => {
          const typeInfo = RESOURCE_TYPES.find(t => t.id === r.type);
          return (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 12px", marginBottom: 6, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 8, background: r.type === "url" ? "var(--bt-bg)" : r.type === "book" ? "var(--st-bg)" : "#F3EAF9", border: `1px solid ${r.type === "url" ? "var(--bt-border)" : r.type === "book" ? "var(--st-border)" : "#D8C0E8"}`, fontWeight: 500, flexShrink: 0 }}>
                    {typeInfo?.label.split(" ")[0]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)" }}>{r.title}</span>
                </div>
                {r.author && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{r.author}{r.publication ? ` — ${r.publication}` : ""}{r.pages ? ` (${r.pages})` : ""}</div>}
                {r.url && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2, wordBreak: "break-all", cursor: "pointer" }} onClick={() => window.open && window.open(r.url)}>{r.url}</div>}
                {r.summary && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>{r.summary}</div>}
              </div>
              <button className="btn-ghost" onClick={() => unlinkResource(r.id)} title="解除連結" style={{ color: "var(--danger)", flexShrink: 0, marginLeft: 8 }}><Icons.X /></button>
            </div>
          );
        })}
        {showLinkPicker && (
          <div style={{ marginTop: 10, background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div className="search-box" style={{ flex: 1, marginBottom: 0 }}>
                <Icons.Search />
                <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋外部資料..." value={resSearch} onChange={e => setResSearch(e.target.value)} />
              </div>
              <button className="btn btn-sm" onClick={() => onNavigate("resources")} title="前往管理外部資料"><Icons.Globe /> 管理資料庫</button>
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {unlinkedResources.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 16 }}>
                  {(data.resources || []).length === 0 ? "尚無外部資料，請先前往「外部資料」頁面新增" : "所有資料都已連結，或沒有符合搜尋的結果"}
                </div>
              ) : (
                unlinkedResources.map(r => {
                  const typeInfo = RESOURCE_TYPES.find(t => t.id === r.type);
                  return (
                    <div key={r.id} onClick={() => linkResource(r.id)} style={{ padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 2 }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: r.type === "url" ? "var(--bt-bg)" : r.type === "book" ? "var(--st-bg)" : "#F3EAF9", fontWeight: 500 }}>{typeInfo?.label.split(" ")[0]}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</span>
                      </div>
                      {r.author && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{r.author}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}><Icons.FileText /> 交叉引用 Cross-references ({crossRefs.length})</div>
          <button className="btn btn-sm" onClick={() => { setShowCrossRefPicker(!showCrossRefPicker); setCrossRefSearch(""); setCrossRefNote(""); }}>
            {showCrossRefPicker ? "收合" : <><Icons.Plus /> 引用筆記</>}
          </button>
        </div>
        {crossRefs.length === 0 && !showCrossRefPicker && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>尚無交叉引用</div>
        )}
        {crossRefs.map(ref => (
          <div key={ref.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 12px", marginBottom: 6, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onNavigate("view-note", { noteId: ref.otherNote.id })}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 8, background: ref.direction === "out" ? "var(--bt-bg)" : "var(--st-bg)", border: `1px solid ${ref.direction === "out" ? "var(--bt-border)" : "var(--st-border)"}`, fontWeight: 500 }}>
                  {ref.direction === "out" ? "→ 引用" : "← 被引用"}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)" }}>
                  {getBookRef(ref.otherNote.bookId, ref.otherNote.chapterStart, ref.otherNote.chapterEnd, ref.otherNote.verseStart, ref.otherNote.verseEnd)}
                </span>
              </div>
              {ref.otherNote.title && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{ref.otherNote.title}</div>}
              {ref.annotation && <div style={{ fontSize: 12, color: "var(--text)", marginTop: 4, fontStyle: "italic" }}>{ref.annotation}</div>}
            </div>
            <button className="btn-ghost" onClick={() => removeCrossRef(ref.id)} style={{ color: "var(--danger)", flexShrink: 0, marginLeft: 8 }}><Icons.X /></button>
          </div>
        ))}
        {showCrossRefPicker && (
          <div style={{ marginTop: 8, background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            {!crossRefNote ? (
              <>
                <div className="search-box" style={{ marginBottom: 8 }}>
                  <Icons.Search />
                  <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋筆記..." value={crossRefSearch} onChange={e => setCrossRefSearch(e.target.value)} />
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {availableCrossRefNotes.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 12 }}>沒有可引用的筆記</div>
                  ) : (
                    availableCrossRefNotes.slice(0, 30).map(n => (
                      <div key={n.id} onClick={() => setCrossRefNote(n.id)} style={{ padding: "6px 8px", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 2 }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent2)" }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</span>
                        {n.title && <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <CrossRefAnnotation
                targetNote={data.notes.find(n => n.id === crossRefNote)}
                onConfirm={(annotation) => addCrossRef(crossRefNote, annotation)}
                onCancel={() => setCrossRefNote("")}
              />
            )}
          </div>
        )}
      </div>

      <AiPanel
        note={note}
        btTags={(note.btTags || []).map(id => data.btTags.find(t => t.id === id)).filter(Boolean)}
        stTags={(note.stTags || []).map(id => data.stTags.find(t => t.id === id)).filter(Boolean)}
      />
    </div>
  );
}
