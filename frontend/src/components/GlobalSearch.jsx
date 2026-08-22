import { useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from './Icons.jsx';

const GROUPS = [
  ['note', '筆記'],
  ['doctrine_annotation', '教義註解'],
  ['theme_chain', '追蹤鏈'],
  ['resource', '資料'],
];

function HighlightedText({ value }) {
  const parts = String(value || '').split(/(<mark>|<\/mark>)/i);
  let marked = false;
  return parts.map((part, index) => {
    if (part.toLowerCase() === '<mark>') { marked = true; return null; }
    if (part.toLowerCase() === '</mark>') { marked = false; return null; }
    return marked ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>;
  });
}

export function GlobalSearch({ onNavigate, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); return undefined; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=40`, { signal: controller.signal })
        .then(response => response.ok ? response.json() : Promise.reject(new Error('搜尋失敗')))
        .then(data => setResults(data.results || []))
        .catch(error => { if (error.name !== 'AbortError') setResults([]); })
        .finally(() => setLoading(false));
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => { setSelected(0); }, [query]);
  useEffect(() => { itemRefs.current[selected]?.scrollIntoView({ block: 'nearest' }); }, [selected]);

  const grouped = useMemo(() => Object.fromEntries(GROUPS.map(([type]) => [type, results.filter(result => result.type === type)])), [results]);
  const ordered = useMemo(() => GROUPS.flatMap(([type]) => grouped[type] || []), [grouped]);

  const activate = result => {
    if (result.type === 'note' || result.type === 'doctrine_annotation') onNavigate('view-note', { noteId: result.parentId });
    else if (result.type === 'theme_chain') onNavigate('chains', { chainId: result.id });
    else if (result.type === 'resource') onNavigate('resources', { resourceId: result.id });
    onClose();
  };

  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(index => Math.min(index + 1, ordered.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(index => Math.max(index - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); if (ordered[selected]) activate(ordered[selected]); }
    else if (event.key === 'Escape') onClose();
  };

  let flatIndex = 0;
  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-backdrop" />
      <div className="global-search-dialog" onClick={event => event.stopPropagation()}>
        <div className="global-search-input">
          <Icons.Search />
          <input ref={inputRef} onKeyDown={onKeyDown} placeholder="搜尋筆記、教義註解、追蹤鏈、外部資料…" value={query} onChange={event => setQuery(event.target.value)} />
          {loading && <Icons.Loader />}
          <span>↑↓ 選擇 · ⏎ 開啟</span>
          <button className="btn-ghost" onClick={onClose}><Icons.X /></button>
        </div>
        {query.trim().length >= 2 && (
          <div className="global-search-results">
            {!loading && results.length === 0 && <div className="empty" style={{ padding: 28 }}>沒有找到相關結果</div>}
            {GROUPS.map(([type, label]) => grouped[type]?.length ? (
              <section key={type}>
                <div className="search-section-title">{label} ({grouped[type].length})</div>
                {grouped[type].map(result => {
                  const index = flatIndex++;
                  return (
                    <button key={`${type}-${result.id}`} ref={element => { itemRefs.current[index] = element; }}
                      className={`search-result-row ${selected === index ? 'selected' : ''}`}
                      onMouseEnter={() => setSelected(index)} onClick={() => activate(result)}>
                      <strong><HighlightedText value={result.titleSnippet || result.title || label} /></strong>
                      {result.ref && <span className="search-result-ref">{result.ref}</span>}
                      {result.snippet && <div className="search-result-snippet"><HighlightedText value={result.snippet} /></div>}
                    </button>
                  );
                })}
              </section>
            ) : null)}
          </div>
        )}
      </div>
    </div>
  );
}
