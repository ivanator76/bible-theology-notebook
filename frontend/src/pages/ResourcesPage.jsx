import { useState, useMemo } from 'react';
import { getBookRef } from '../utils/getBookRef.js';
import { uid } from '../utils/uid.js';
import { Icons } from '../components/Icons.jsx';
import { RESOURCE_TYPES } from '../data/resourceTypes.js';

export function ResourcesPage({ data, onUpdate, onNavigate }) {
  const { resources = [], resourceLinks = [], notes } = data;
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [linking, setLinking] = useState(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const [form, setForm] = useState({ type: "url", title: "", url: "", author: "", publication: "", pages: "", summary: "" });

  const resetForm = () => setForm({ type: "url", title: "", url: "", author: "", publication: "", pages: "", summary: "" });

  const fetchUrlTitle = async (url) => {
    if (!url || !url.startsWith("http")) return;
    setFetchingUrl(true);
    try {
      const res = await fetch(`/api/fetch-title?url=${encodeURIComponent(url)}`);
      const result = await res.json();
      if (result.title) {
        setForm(prev => ({ ...prev, title: prev.title || result.title }));
      }
    } catch (e) {
      console.error("fetch-title failed:", e);
    }
    setFetchingUrl(false);
  };

  const handleUrlChange = (url) => {
    setForm(prev => ({ ...prev, url }));
    if (url.startsWith("http") && !form.title) fetchUrlTitle(url);
  };

  const startNew = () => { resetForm(); setEditing("new"); };
  const startEdit = (r) => { setForm({ ...r }); setEditing(r.id); };
  const cancel = () => { setEditing(null); resetForm(); };

  const save = () => {
    if (!form.title.trim()) return alert("請輸入標題");
    const id = editing === "new" ? uid() : editing;
    const resource = { ...form, id, title: form.title.trim(), createdAt: editing === "new" ? Date.now() : (resources.find(r => r.id === id)?.createdAt || Date.now()), updatedAt: Date.now() };
    const newResources = editing === "new" ? [...resources, resource] : resources.map(r => r.id === id ? resource : r);
    onUpdate({ ...data, resources: newResources });
    setEditing(null); resetForm();
  };

  const remove = (id) => {
    if (!confirm("確定刪除此資料？")) return;
    onUpdate({ ...data, resources: resources.filter(r => r.id !== id), resourceLinks: (resourceLinks || []).filter(l => l.resourceId !== id) });
  };

  const getLinkedNotes = (resId) => {
    const noteIds = (resourceLinks || []).filter(l => l.resourceId === resId).map(l => l.noteId);
    return notes.filter(n => noteIds.includes(n.id));
  };

  const linkNote = (resourceId, noteId) => {
    const exists = (resourceLinks || []).some(l => l.resourceId === resourceId && l.noteId === noteId);
    if (exists) return;
    onUpdate({ ...data, resourceLinks: [...(resourceLinks || []), { resourceId, noteId }] });
    setLinking(null);
  };

  const unlinkNote = (resourceId, noteId) => {
    onUpdate({ ...data, resourceLinks: (resourceLinks || []).filter(l => !(l.resourceId === resourceId && l.noteId === noteId)) });
  };

  const filtered = useMemo(() => {
    let list = [...resources].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    if (filterType) list = list.filter(r => r.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.title || "").toLowerCase().includes(q) || (r.author || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q) || (r.summary || "").toLowerCase().includes(q));
    }
    return list;
  }, [resources, filterType, search]);

  const unlinkedNotes = useMemo(() => {
    if (!linking) return [];
    const linkedIds = (resourceLinks || []).filter(l => l.resourceId === linking).map(l => l.noteId);
    return notes.filter(n => !linkedIds.includes(n.id)).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [linking, resourceLinks, notes]);

  if (editing) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={cancel}><Icons.Back /></button>
            <h2 className="page-title">{editing === "new" ? "新增外部資料" : "編輯外部資料"}</h2>
          </div>
          <button className="btn btn-primary" onClick={save}>儲存</button>
        </div>
        <div className="card">
          <div className="field">
            <label className="label">資料類型</label>
            <div style={{ display: "flex", gap: 8 }}>
              {RESOURCE_TYPES.map(t => (
                <button key={t.id} className={`btn btn-sm ${form.type === t.id ? "btn-primary" : ""}`} onClick={() => setForm({ ...form, type: t.id })}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="label">標題</label>
            <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="資料標題" />
          </div>
          {(form.type === "url" || form.type === "video") && (
            <div className="field">
              <label className="label">{form.type === "video" ? "影片/Podcast 連結" : "網頁連結"}</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input" style={{ flex: 1 }} value={form.url || ""} onChange={e => handleUrlChange(e.target.value)} placeholder="https://..." />
                <button className="btn btn-sm" onClick={() => fetchUrlTitle(form.url)} disabled={fetchingUrl || !form.url} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                  {fetchingUrl ? "抓取中..." : "抓取標題"}
                </button>
              </div>
              {fetchingUrl && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>正在嘗試抓取網頁標題...</div>}
            </div>
          )}
          {form.type === "book" && (
            <>
              <div className="row">
                <div className="field">
                  <label className="label">作者</label>
                  <input className="input" value={form.author || ""} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="作者姓名" />
                </div>
                <div className="field">
                  <label className="label">出版物/出版社</label>
                  <input className="input" value={form.publication || ""} onChange={e => setForm({ ...form, publication: e.target.value })} placeholder="書名或期刊名" />
                </div>
              </div>
              <div className="field">
                <label className="label">頁數/章節</label>
                <input className="input" value={form.pages || ""} onChange={e => setForm({ ...form, pages: e.target.value })} placeholder="例：pp. 120-135" />
              </div>
            </>
          )}
          {form.type === "video" && (
            <div className="field">
              <label className="label">作者/頻道</label>
              <input className="input" value={form.author || ""} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="頻道或講者" />
            </div>
          )}
          <div className="field">
            <label className="label">摘要備註</label>
            <textarea className="textarea" style={{ minHeight: 100 }} value={form.summary || ""} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="此資料的重點、與你研究的關聯..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">外部資料 Resources</h2>
        <button className="btn btn-primary" onClick={startNew}><Icons.Plus /> 新增資料</button>
      </div>

      <div className="search-box">
        <Icons.Search />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋資料..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${!filterType ? "btn-primary" : ""}`} onClick={() => setFilterType("")}>全部</button>
        {RESOURCE_TYPES.map(t => (
          <button key={t.id} className={`btn btn-sm ${filterType === t.id ? "btn-primary" : ""}`} onClick={() => setFilterType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}><Icons.Globe /></div>
          <div>{resources.length === 0 ? "尚無外部資料" : "沒有符合條件的資料"}</div>
          {resources.length === 0 && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={startNew}><Icons.Plus /> 新增第一筆</button>}
        </div>
      ) : (
        filtered.map(r => {
          const linked = getLinkedNotes(r.id);
          const typeInfo = RESOURCE_TYPES.find(t => t.id === r.type);
          return (
            <div key={r.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: r.type === "url" ? "var(--bt-bg)" : r.type === "book" ? "var(--st-bg)" : "#F3EAF9", border: `1px solid ${r.type === "url" ? "var(--bt-border)" : r.type === "book" ? "var(--st-border)" : "#D8C0E8"}`, fontWeight: 500 }}>
                      {typeInfo?.label || r.type}
                    </span>
                    <span className="note-meta">{new Date(r.updatedAt || r.createdAt).toLocaleDateString("zh-TW")}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--accent2)", fontFamily: "var(--font-zh)" }}>{r.title}</div>
                  {r.author && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{r.author}{r.publication ? ` — ${r.publication}` : ""}{r.pages ? ` (${r.pages})` : ""}</div>}
                  {r.url && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2, wordBreak: "break-all" }}>{r.url}</div>}
                  {r.summary && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, fontStyle: "italic" }}>{r.summary}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 12 }}>
                  <button className="btn-ghost" onClick={() => startEdit(r)} title="編輯"><Icons.Edit /></button>
                  <button className="btn-ghost" onClick={() => remove(r.id)} title="刪除" style={{ color: "var(--danger)" }}><Icons.Trash /></button>
                </div>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>連結的筆記 ({linked.length})</span>
                  <button className="btn btn-sm" onClick={() => setLinking(linking === r.id ? null : r.id)}>
                    <Icons.Plus /> 連結筆記
                  </button>
                </div>
                {linked.map(n => (
                  <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                    <span onClick={() => onNavigate("view-note", { noteId: n.id })} style={{ fontSize: 13, color: "var(--accent2)", cursor: "pointer", fontWeight: 500 }}>
                      {getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}
                      {n.title ? ` — ${n.title}` : ""}
                    </span>
                    <button className="btn-ghost" onClick={() => unlinkNote(r.id, n.id)} style={{ color: "var(--danger)", fontSize: 11 }} title="解除連結"><Icons.X /></button>
                  </div>
                ))}
                {linking === r.id && (
                  <div style={{ marginTop: 8, background: "var(--bg)", padding: 10, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", maxHeight: 200, overflowY: "auto" }}>
                    {unlinkedNotes.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 8 }}>沒有可連結的筆記</div>
                    ) : (
                      unlinkedNotes.map(n => (
                        <div key={n.id} onClick={() => linkNote(r.id, n.id)}
                          style={{ padding: "6px 8px", fontSize: 13, cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <span style={{ fontWeight: 500 }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</span>
                          {n.title && <span style={{ color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
