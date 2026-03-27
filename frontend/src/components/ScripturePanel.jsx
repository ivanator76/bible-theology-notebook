import { useState, useEffect } from 'react';
import { BOOK_MAP } from '../data/bibleBooks.js';
import { Icons } from './Icons.jsx';

const NT_BOOKS = new Set([
  'mat','mrk','luk','jhn','act','rom','1co','2co','gal','eph',
  'php','col','1th','2th','1ti','2ti','tit','phm','heb','jas',
  '1pe','2pe','1jn','2jn','3jn','jud','rev',
]);

export function ScripturePanel({ bookId, chapterStart, chapterEnd, verseStart, verseEnd, collapsible = false }) {
  const [lang, setLang] = useState('both');
  const [collapsed, setCollapsed] = useState(false);
  const [showFullChapter, setShowFullChapter] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('scripture-font-size');
    return saved ? parseInt(saved) : 14;
  });

  const changeFontSize = (delta) => {
    setFontSize(prev => {
      const next = Math.min(22, Math.max(11, prev + delta));
      localStorage.setItem('scripture-font-size', String(next));
      return next;
    });
  };

  // CUV + WEB data
  const [chapters, setChapters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Original language data (Greek / Hebrew)
  const [origChapters, setOrigChapters] = useState({});
  const [origLoading, setOrigLoading] = useState(false);
  const [origError, setOrigError] = useState(null);

  const chStart = parseInt(chapterStart) || 0;
  const chEnd = parseInt(chapterEnd || chapterStart) || chStart;
  const vsStart = parseInt(verseStart) || 0;
  const vsEnd = parseInt(verseEnd) || 0;
  const hasVerseRange = vsStart > 0;

  // Reset state when passage changes
  useEffect(() => {
    setShowFullChapter(false);
    setOrigChapters({});
    setOrigError(null);
  }, [bookId, chapterStart, chapterEnd, verseStart, verseEnd]);

  // Fetch CUV + WEB
  useEffect(() => {
    if (!bookId || !chapterStart) { setChapters({}); return; }
    const needed = [];
    for (let c = chStart; c <= chEnd; c++) needed.push(c);

    setLoading(true);
    setError(null);

    Promise.all(needed.map(async (ch) => {
      const cacheKey = `${bookId}-${ch}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return [ch, JSON.parse(cached)];
      const res = await fetch(`/api/bible/${bookId}/${ch}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      return [ch, data];
    }))
      .then(results => {
        const map = {};
        for (const [ch, data] of results) map[ch] = data;
        setChapters(map);
        setLoading(false);
      })
      .catch(() => {
        setError('無法載入經文，請確認網路連線');
        setLoading(false);
      });
  }, [bookId, chapterStart, chapterEnd]);

  // Fetch original language (lazy — only when 'original' tab is active)
  useEffect(() => {
    if (lang !== 'original' || !bookId || !chapterStart) return;

    const needed = [];
    for (let c = chStart; c <= chEnd; c++) {
      if (!origChapters[c]) needed.push(c);
    }
    if (!needed.length) return;

    setOrigLoading(true);
    setOrigError(null);

    Promise.all(needed.map(async (ch) => {
      const cacheKey = `orig-${bookId}-${ch}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return [ch, JSON.parse(cached)];
      const res = await fetch(`/api/bible/original/${bookId}/${ch}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      return [ch, data];
    }))
      .then(results => {
        setOrigChapters(prev => {
          const map = { ...prev };
          for (const [ch, data] of results) map[ch] = data;
          return map;
        });
        setOrigLoading(false);
      })
      .catch(() => {
        setOrigError('無法載入原文，請確認網路連線');
        setOrigLoading(false);
      });
  }, [lang, bookId, chapterStart, chapterEnd]);

  const book = BOOK_MAP[bookId];
  if (!bookId || !chapterStart) return null;

  const isNT = NT_BOOKS.has(bookId);
  const origLangLabel = isNT ? '希臘文' : '希伯來文';

  const isInRange = (ch, verse) => {
    if (!vsStart) return true;
    const singleChapter = !chapterEnd || chapterEnd === chapterStart;
    if (singleChapter) return verse >= vsStart && (!vsEnd || verse <= vsEnd);
    if (ch === chStart) return verse >= vsStart;
    if (ch === chEnd) return !vsEnd || verse <= vsEnd;
    return ch > chStart && ch < chEnd;
  };

  const renderChapter = (ch) => {
    if (lang === 'original') {
      const data = origChapters[ch];
      if (!data) return null;
      const isHebrew = data.lang === 'hebrew';
      const visibleVerses = (hasVerseRange && !showFullChapter)
        ? data.verses.filter(v => isInRange(ch, v.verse))
        : data.verses;
      if (!visibleVerses.length) return null;
      return (
        <div key={ch}>
          {chEnd > chStart && (
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', margin: '10px 0 4px' }}>
              第 {ch} 章
            </div>
          )}
          {visibleVerses.map(({ verse, text }) => (
            <div key={verse} className={`scripture-verse ${hasVerseRange && isInRange(ch, verse) ? 'highlighted' : ''}`}>
              {isHebrew ? (
                <div style={{ direction: 'rtl', textAlign: 'right', fontFamily: '"SBL Hebrew", "Ezra SIL", "Arial Hebrew", "Tahoma", serif', fontSize: fontSize + 1.5, lineHeight: 2 }}>
                  <span style={{ direction: 'ltr', display: 'inline-block', marginLeft: 8, fontSize: 10, fontWeight: 700, color: 'var(--muted)', verticalAlign: 'middle', fontFamily: 'var(--font-ui)' }}>{verse}</span>
                  {text}
                </div>
              ) : (
                <>
                  <sup className="scripture-verse-num">{verse}</sup>
                  <span style={{ fontFamily: '"SBL Greek", "Palatino Linotype", "Gentium Plus", serif', fontSize: fontSize, lineHeight: 1.85 }}>{text}</span>
                </>
              )}
            </div>
          ))}
        </div>
      );
    }

    // CUV + WEB rendering (existing logic)
    const data = chapters[ch];
    if (!data) return null;
    const zhVerses = data.zh || [];
    const enVerses = data.en || [];
    const zhMap = Object.fromEntries(zhVerses.map(v => [v.verse, v.text]));
    const enMap = Object.fromEntries(enVerses.map(v => [v.verse, v.text]));
    const allVerses = zhVerses.length ? zhVerses.map(v => v.verse) : enVerses.map(v => v.verse);

    const visibleVerses = (hasVerseRange && !showFullChapter)
      ? allVerses.filter(v => isInRange(ch, v))
      : allVerses;

    if (!visibleVerses.length) return null;

    return (
      <div key={ch}>
        {chEnd > chStart && (
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', margin: '10px 0 4px', fontFamily: 'var(--font-zh)' }}>
            第 {ch} 章
          </div>
        )}
        {visibleVerses.map(v => (
          <div key={v} className={`scripture-verse ${hasVerseRange && isInRange(ch, v) ? 'highlighted' : ''}`}>
            {lang === 'both' ? (
              <>
                {zhMap[v] && <div className="scripture-zh" style={{ fontSize }}><sup className="scripture-verse-num">{v}</sup>{zhMap[v]}</div>}
                {enMap[v] && <div className="scripture-en" style={{ fontSize }}>{enMap[v]}</div>}
              </>
            ) : (
              <>
                <sup className="scripture-verse-num">{v}</sup>
                {lang === 'zh' && <span className="scripture-zh" style={{ fontSize }}>{zhMap[v] || <span style={{ color: 'var(--muted)' }}>—</span>}</span>}
                {lang === 'en' && <span className="scripture-en" style={{ fontStyle: 'normal', color: 'var(--text)', fontSize }}>{enMap[v] || <span style={{ color: 'var(--muted)' }}>—</span>}</span>}
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const isOrigLoading = lang === 'original' && origLoading;
  const isOrigError = lang === 'original' && origError;
  const showLoading = lang === 'original' ? isOrigLoading : loading;
  const showError = lang === 'original' ? isOrigError : error;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 12 }}>
        <div className="card-title" style={{ margin: 0 }}>
          <Icons.BookOpen /> 經文參考
          {book && (
            <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6, fontSize: 12 }}>
              {book.zh} {chStart}{chEnd > chStart ? `–${chEnd}` : ''} 章
              {vsStart ? ` ${vsStart}${vsEnd && vsEnd !== vsStart ? `–${vsEnd}` : ''}節` : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!collapsed && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {['zh', 'both', 'en', 'original'].map(l => (
                  <button
                    key={l}
                    className={`scripture-lang-btn ${lang === l ? 'active' : ''}`}
                    onClick={() => setLang(l)}
                    title={l === 'original' ? origLangLabel : undefined}
                  >
                    {l === 'zh' ? '中文' : l === 'en' ? 'English' : l === 'both' ? '中英' : '原文'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, borderLeft: '1px solid var(--border)', paddingLeft: 6 }}>
                <button className="btn-ghost" onClick={() => changeFontSize(-1)} title="縮小字體" style={{ fontSize: 13, padding: '2px 5px', lineHeight: 1 }}>A−</button>
                <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 24, textAlign: 'center' }}>{fontSize}</span>
                <button className="btn-ghost" onClick={() => changeFontSize(1)} title="放大字體" style={{ fontSize: 13, padding: '2px 5px', lineHeight: 1 }}>A+</button>
              </div>
            </div>
          )}
          {collapsible && (
            <button className="btn-ghost" onClick={() => setCollapsed(c => !c)} title={collapsed ? '展開' : '收合'}>
              {collapsed ? <Icons.ChevronDown /> : <Icons.ChevronUp />}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        showLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icons.Loader /> {lang === 'original' ? `載入${origLangLabel}中...` : '載入經文中...'}
          </div>
        ) : showError ? (
          <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>{showError}</div>
        ) : (
          <>
            {lang === 'original' && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textAlign: 'right' }}>
                {isNT ? 'Tischendorf 8th ed. Greek NT' : 'Westminster Leningrad Codex (WLC)'}
              </div>
            )}
            <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
              {Array.from({ length: chEnd - chStart + 1 }, (_, i) => chStart + i).map(ch => renderChapter(ch))}
              {lang !== 'original' && Object.keys(chapters).length === 0 && (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>尚無資料</div>
              )}
              {lang === 'original' && Object.keys(origChapters).length === 0 && !origLoading && (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>尚無資料</div>
              )}
            </div>
            {hasVerseRange && (
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline' }}
                  onClick={() => setShowFullChapter(f => !f)}
                >
                  {showFullChapter ? '只顯示選擇節數' : '顯示整章'}
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
