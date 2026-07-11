import { useState, useEffect } from 'react';
import { BOOK_MAP } from '../data/bibleBooks.js';
import { getBookRef } from '../utils/getBookRef.js';
import { Icons } from './Icons.jsx';

async function fetchChapter(book, ch) {
  const cacheKey = `${book}-${ch}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);
  const res = await fetch(`/api/bible/${book}/${ch}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  sessionStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
}

// Collect the {chapter, verse, zh, en} rows covered by the reference range.
function collectVerses(chapters, info) {
  const chStart = parseInt(info.chs) || 0;
  const chEnd = info.che ? parseInt(info.che) : chStart;
  const vStart = parseInt(info.vss) || 0;
  const vEnd = info.vse ? parseInt(info.vse) : (info.che ? 0 : vStart);
  const rows = [];
  for (let c = chStart; c <= chEnd; c++) {
    const data = chapters[c];
    if (!data) continue;
    const zhMap = Object.fromEntries((data.zh || []).map(v => [v.verse, v.text]));
    const enMap = Object.fromEntries((data.en || []).map(v => [v.verse, v.text]));
    const verseNums = (data.zh && data.zh.length ? data.zh : (data.en || [])).map(v => v.verse);
    for (const v of verseNums) {
      const singleChapter = chStart === chEnd;
      let inRange;
      if (singleChapter) inRange = v >= vStart && (!vEnd || v <= vEnd);
      else if (c === chStart) inRange = v >= vStart;
      else if (c === chEnd) inRange = !vEnd || v <= vEnd;
      else inRange = true;
      if (inRange) rows.push({ chapter: c, verse: v, zh: zhMap[v], en: enMap[v] });
    }
  }
  return rows;
}

export function ScriptureRefPopover({ info, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  useEffect(() => {
    let cancelled = false;
    const chStart = parseInt(info.chs) || 0;
    const chEnd = info.che ? parseInt(info.che) : chStart;
    (async () => {
      try {
        const chapters = {};
        for (let c = chStart; c <= chEnd; c++) chapters[c] = await fetchChapter(info.book, c);
        if (cancelled) return;
        setState({ loading: false, error: null, rows: collectVerses(chapters, info) });
      } catch {
        if (!cancelled) setState({ loading: false, error: '無法載入經文', rows: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [info]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const book = BOOK_MAP[info.book];
  const title = getBookRef(info.book, info.chs, info.che, info.vss, info.vse);

  // Clamp horizontal position so the card stays within the viewport.
  const width = 340;
  const left = Math.max(8, Math.min(info.x, window.innerWidth - width - 8));
  const top = Math.min(info.y + 6, window.innerHeight - 80);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={onClose} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', left, top, width, zIndex: 301,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow2)',
          maxHeight: 360, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent2)' }}>{title || (book ? book.zh : info.book)}</span>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 2 }}><Icons.X /></button>
        </div>
        <div style={{ padding: '8px 12px', overflowY: 'auto' }}>
          {state.loading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icons.Loader /> 載入經文中...
            </div>
          ) : state.error ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>{state.error}</div>
          ) : state.rows.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>找不到此段經文</div>
          ) : (
            state.rows.map(r => (
              <div key={`${r.chapter}-${r.verse}`} style={{ marginBottom: 8 }}>
                {r.zh && (
                  <div className="scripture-zh" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                    <sup className="scripture-verse-num">{r.chapter}:{r.verse}</sup>{r.zh}
                  </div>
                )}
                {r.en && <div className="scripture-en" style={{ fontSize: 12 }}>{r.en}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
