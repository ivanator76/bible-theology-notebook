import { useEffect, useMemo, useState } from 'react';
import { ALL_BOOKS, BOOK_MAP } from '../data/bibleBooks.js';
import { Icons } from '../components/Icons.jsx';

function noteCoversVerse(note, bookId, chapter, verse) {
  if (note.bookId !== bookId || !note.chapterStart) return false;
  const startChapter = parseInt(note.chapterStart, 10);
  const endChapter = parseInt(note.chapterEnd || note.chapterStart, 10);
  if (chapter < startChapter || chapter > endChapter) return false;
  const startVerse = chapter === startChapter && note.verseStart ? parseInt(note.verseStart, 10) : 1;
  let endVerse = Infinity;
  if (chapter === endChapter) {
    if (note.verseEnd) endVerse = parseInt(note.verseEnd, 10);
    else if (startChapter === endChapter && note.verseStart) endVerse = parseInt(note.verseStart, 10);
  }
  return verse >= startVerse && verse <= endVerse;
}

export function ReadingPage({ data, onNavigate, initialBookId, initialChapter }) {
  const [bookId, setBookId] = useState(initialBookId || 'rom');
  const [chapter, setChapter] = useState(parseInt(initialChapter, 10) || 8);
  const [scripture, setScripture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const book = BOOK_MAP[bookId];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/bible/${bookId}/${chapter}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('經文資料不可用')))
      .then(setScripture).catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [bookId, chapter]);

  const verses = useMemo(() => {
    const zh = scripture?.zh || [];
    const en = scripture?.en || [];
    const numbers = [...new Set([...zh.map(v => Number(v.verse)), ...en.map(v => Number(v.verse))])].sort((a, b) => a - b);
    return numbers.map(verse => ({
      verse,
      zh: zh.find(v => Number(v.verse) === verse)?.text || '',
      en: en.find(v => Number(v.verse) === verse)?.text || '',
      notes: data.notes.filter(note => noteCoversVerse(note, bookId, chapter, verse)),
    }));
  }, [scripture, data.notes, bookId, chapter]);

  const annotatedCount = verses.filter(v => v.notes.length).length;
  const changeBook = value => { setBookId(value); setChapter(1); };
  const goChapter = next => setChapter(Math.min(Math.max(next, 1), book?.ch || 1));

  return (
    <div className="reading-page">
      <div className="page-header reading-header">
        <div>
          <h2 className="page-title">讀經模式 Reading</h2>
          <div className="reading-progress">本章 {annotatedCount} 節已有筆記 · 共 {verses.length || '—'} 節</div>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('new-note', { bookId, chapterStart: String(chapter) })}>
          <Icons.Plus /> 本章新增筆記
        </button>
      </div>

      <div className="card reading-toolbar">
        <select className="select" value={bookId} onChange={event => changeBook(event.target.value)}>
          {ALL_BOOKS.map(item => <option key={item.id} value={item.id}>{item.zh} {item.en}</option>)}
        </select>
        <button className="btn btn-sm" disabled={chapter <= 1} onClick={() => goChapter(chapter - 1)}><Icons.Back /> 上一章</button>
        <select className="select reading-chapter-select" value={chapter} onChange={event => setChapter(parseInt(event.target.value, 10))}>
          {Array.from({ length: book?.ch || 0 }, (_, index) => index + 1).map(value => <option key={value} value={value}>第 {value} 章</option>)}
        </select>
        <button className="btn btn-sm" disabled={chapter >= (book?.ch || 1)} onClick={() => goChapter(chapter + 1)}>下一章 ›</button>
      </div>

      <div className="reading-title-block">
        <h3>{book?.zh} {chapter}</h3>
        <span>{book?.en} {chapter}</span>
      </div>

      {loading && <div className="empty"><Icons.Loader /> 載入經文中…</div>}
      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}
      {!loading && !error && (
        <div className="reading-verses">
          {verses.map(row => (
            <article key={row.verse} className={`reading-verse ${row.notes.length ? 'has-notes' : ''}`}>
              <div className="reading-verse-number">{row.verse}</div>
              <div className="reading-verse-text">
                <div className="scripture-zh">{row.zh}</div>
                <div className="scripture-en">{row.en}</div>
                {row.notes.length > 0 && (
                  <div className="reading-note-links">
                    {row.notes.map(note => (
                      <button key={note.id} className="reading-note-chip" onClick={() => onNavigate('view-note', { noteId: note.id })}>
                        <span className="reading-note-dot" />{note.title || '查看筆記'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="reading-add-note" title={`為第 ${row.verse} 節新增筆記`}
                onClick={() => onNavigate('new-note', { bookId, chapterStart: String(chapter), verseStart: String(row.verse) })}>
                <Icons.Plus />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
