import { useState } from 'react';
import { BIBLE_BOOKS, BOOK_MAP } from '../data/bibleBooks.js';
import { getBookRef, } from '../utils/getBookRef.js';
import { getVerseCount } from '../data/bibleBooks.js';
import { uid } from '../utils/uid.js';
import { parseMarkdown } from '../utils/parseMarkdown.js';
import { NOTE_TEMPLATES } from '../data/templates.js';
import { Icons } from '../components/Icons.jsx';
import { TagPill } from '../components/TagPill.jsx';
import { BookSelector } from '../components/BookSelector.jsx';
import { TagSelector } from '../components/TagSelector.jsx';
import { DoctrineLinkEditor } from '../components/DoctrineLinkEditor.jsx';
import { ScripturePanel } from '../components/ScripturePanel.jsx';

export function NoteEditor({ data, noteId, onSave, onCancel, onNavigate }) {
  const existing = noteId ? data.notes.find(n => n.id === noteId) : null;
  const [bookId, setBookId] = useState(existing?.bookId || "");
  const [chapterStart, setChapterStart] = useState(existing?.chapterStart || "");
  const [chapterEnd, setChapterEnd] = useState(existing?.chapterEnd || "");
  const [verseStart, setVerseStart] = useState(existing?.verseStart || "");
  const [verseEnd, setVerseEnd] = useState(existing?.verseEnd || "");
  const [title, setTitle] = useState(existing?.title || "");
  const [content, setContent] = useState(existing?.content || "");
  const [selBt, setSelBt] = useState(existing?.btTags || []);
  const [selSt, setSelSt] = useState(existing?.stTags || []);
  const [docLinks, setDocLinks] = useState(
    noteId ? (data.doctrineLinks || []).filter(l => l.noteId === noteId).map(l => ({ doctrineId: l.doctrineId, annotation: l.annotation })) : []
  );
  const [preview, setPreview] = useState(false);

  const book = BOOK_MAP[bookId];
  const maxCh = book ? book.ch : 0;
  const chapterOptions = Array.from({ length: maxCh }, (_, i) => i + 1);
  const verseStartMax = getVerseCount(bookId, chapterStart);
  const verseEndChapter = chapterEnd || chapterStart;
  const verseEndMax = getVerseCount(bookId, verseEndChapter);

  const toggleBt = id => setSelBt(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSt = id => setSelSt(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = () => {
    if (!bookId) return alert("請選擇書卷");
    if (!content.trim()) return alert("請輸入筆記內容");
    const note = {
      id: existing?.id || uid(),
      bookId, chapterStart, chapterEnd, verseStart, verseEnd,
      title: title.trim(),
      content,
      btTags: selBt,
      stTags: selSt,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSave(note, docLinks);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" onClick={onCancel}><Icons.Back /></button>
          <h2 className="page-title">{existing ? "編輯筆記" : "新增筆記"}</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setPreview(!preview)}>{preview ? "編輯" : "預覽"}</button>
          <button className="btn btn-primary" onClick={handleSave}>儲存</button>
        </div>
      </div>

      {preview ? (
        <div className="card">
          <div className="note-ref" style={{ fontSize: 18, marginBottom: 4 }}>
            {getBookRef(bookId, chapterStart, chapterEnd, verseStart, verseEnd)}
          </div>
          {title && <h3 style={{ fontFamily: "var(--font-zh)", fontSize: 16, marginBottom: 12 }}>{title}</h3>}
          <div className="note-tags" style={{ marginBottom: 16 }}>
            {selBt.map(id => { const t = data.btTags.find(x => x.id === id); return t ? <TagPill key={id} tag={t} type="bt" /> : null; })}
            {selSt.map(id => { const t = data.stTags.find(x => x.id === id); return t ? <TagPill key={id} tag={t} type="st" /> : null; })}
          </div>
          <div className="md-preview" dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
          {docLinks.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div className="label">系統神學教義連結</div>
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
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><Icons.Book /> 經文範圍</div>
            <div className="field">
              <label className="label">書卷</label>
              <BookSelector value={bookId} onChange={v => { setBookId(v); setChapterStart(""); setChapterEnd(""); setVerseStart(""); setVerseEnd(""); }} />
            </div>
            <div className="row">
              <div className="field">
                <label className="label">起始章</label>
                <select className="select" value={chapterStart} onChange={e => { setChapterStart(e.target.value); setVerseStart(""); if (!chapterEnd) setVerseEnd(""); }} disabled={!bookId}>
                  <option value="">選擇章...</option>
                  {chapterOptions.map(c => <option key={c} value={String(c)}>第 {c} 章</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">起始節</label>
                <select className="select" value={verseStart} onChange={e => setVerseStart(e.target.value)} disabled={!chapterStart}>
                  <option value="">全章</option>
                  {Array.from({ length: verseStartMax }, (_, i) => i + 1).map(v => <option key={v} value={String(v)}>第 {v} 節</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">結束章</label>
                <select className="select" value={chapterEnd} onChange={e => { setChapterEnd(e.target.value); setVerseEnd(""); }} disabled={!chapterStart}>
                  <option value="">同起始章</option>
                  {chapterOptions.filter(c => c >= parseInt(chapterStart || "1")).map(c => <option key={c} value={String(c)}>第 {c} 章</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">結束節</label>
                <select className="select" value={verseEnd} onChange={e => setVerseEnd(e.target.value)} disabled={!chapterStart}>
                  <option value="">{verseStart && !chapterEnd ? "同起始節" : "章末"}</option>
                  {Array.from({ length: verseEndMax }, (_, i) => i + 1)
                    .filter(v => {
                      const sameChapter = !chapterEnd || chapterEnd === chapterStart;
                      return !(sameChapter && verseStart && v < parseInt(verseStart));
                    })
                    .map(v => <option key={v} value={String(v)}>第 {v} 節</option>)}
                </select>
              </div>
            </div>
            {bookId && chapterStart && (
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, fontStyle: "italic" }}>
                {getBookRef(bookId, chapterStart, chapterEnd, verseStart, verseEnd)}
              </div>
            )}
          </div>

          {bookId && chapterStart && (
            <ScripturePanel
              bookId={bookId}
              chapterStart={chapterStart}
              chapterEnd={chapterEnd}
              verseStart={verseStart}
              verseEnd={verseEnd}
              collapsible={true}
            />
          )}

          <div className="card" style={{ marginBottom: 16, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title" style={{ margin: 0 }}><Icons.FileText /> 筆記內容</div>
              {!noteId && (
                <select className="select" style={{ width: "auto", minWidth: 140, fontSize: 12 }} onChange={e => {
                  const tpl = NOTE_TEMPLATES.find(t => t.id === e.target.value);
                  if (tpl && tpl.content) {
                    if (!content.trim() || confirm("套用範本將覆蓋目前內容，確定？")) setContent(tpl.content);
                  }
                  e.target.value = "";
                }} defaultValue="">
                  <option value="" disabled>套用範本...</option>
                  {NOTE_TEMPLATES.filter(t => t.id !== "blank").map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="label">標題（可選）</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="例：逾越節羔羊的神學意涵" />
            </div>
            <div className="field">
              <label className="label">內容（支援 Markdown）</label>
              <textarea className="textarea" value={content} onChange={e => setContent(e.target.value)} placeholder={"在此撰寫你的筆記...\n\n支援 Markdown 格式：\n# 標題\n**粗體** *斜體*\n- 列表\n> 引用\n\n或選擇右上角的範本開始"} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><Icons.Tag /> 主題標籤</div>
            <TagSelector
              btTags={data.btTags}
              stTags={data.stTags}
              selectedBt={selBt}
              selectedSt={selSt}
              onToggleBt={toggleBt}
              onToggleSt={toggleSt}
              onGoToTags={onNavigate ? () => onNavigate("tags") : undefined}
            />
          </div>

          <div className="card">
            <div className="card-title"><Icons.Link /> 系統神學教義連結</div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
              記錄此經文筆記如何貢獻於某個系統神學教義的理解
            </p>
            <DoctrineLinkEditor links={docLinks} stTags={data.stTags} onChange={setDocLinks} />
          </div>
        </>
      )}
    </div>
  );
}
