import { useState, useEffect, useCallback } from 'react';
import { parseMarkdown } from '../utils/parseMarkdown.js';
import { Icons } from './Icons.jsx';
import { ApiKeyModal } from './ApiKeyModal.jsx';

const TYPES = [
  { id: 'related_scriptures', label: '建議相關經文', desc: '找出主題相近的其他經文段落' },
  { id: 'doctrine_links', label: '建議教義連結', desc: '分析可連結的系統神學教義' },
  { id: 'research_directions', label: '延伸研究方向', desc: '建議下一步可以探索的方向' },
];

const PROVIDER_LABELS = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google' };

export function AiPanel({ note, btTags, stTags }) {
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [error, setError] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const checkKey = useCallback(() => {
    fetch('/api/ai/status').then(r => r.json()).then(d => setStatus(d)).catch(() => setStatus({ hasKey: false }));
  }, []);

  const hasKey = status?.hasKey;

  useEffect(() => { checkKey(); }, [checkKey]);

  const suggest = async (type) => {
    if (loading) return;
    setLoading(type);
    setActiveType(type);
    setError(null);

    let scripture = null;
    if (note.bookId && note.chapterStart) {
      const lines = [];
      for (let ch = parseInt(note.chapterStart); ch <= parseInt(note.chapterEnd || note.chapterStart); ch++) {
        const cached = sessionStorage.getItem(`${note.bookId}-${ch}`);
        if (cached) {
          const data = JSON.parse(cached);
          if (data.zh) lines.push(...data.zh.map(v => `${v.verse} ${v.text}`));
        }
      }
      if (lines.length) scripture = lines.join('\n');
    }

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          note: {
            ref: `${note.bookId} ${note.chapterStart}${note.chapterEnd && note.chapterEnd !== note.chapterStart ? `–${note.chapterEnd}` : ''}章${note.verseStart ? ` ${note.verseStart}${note.verseEnd ? `–${note.verseEnd}` : ''}節` : ''}`,
            title: note.title || '',
            content: note.content || '',
          },
          btTags: btTags.map(t => t.name),
          stTags: stTags.map(t => t.name),
          scripture,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `錯誤 ${res.status}`);
      setResults(prev => ({ ...prev, [type]: data.result }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  if (status === null) return null;

  return (
    <>
      {showKeyModal && (
        <ApiKeyModal onClose={() => setShowKeyModal(false)} onSaved={() => { checkKey(); setError(null); }} />
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Sparkles /> AI 輔助分析
            {status?.provider && hasKey && (
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)', background: 'var(--surface2)', borderRadius: 99, padding: '2px 8px' }}>
                {PROVIDER_LABELS[status.provider] || status.provider}
              </span>
            )}
          </div>
          <button
            className="btn-ghost"
            onClick={() => setShowKeyModal(true)}
            title="設定 API Key"
            style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icons.Edit /> API Key
          </button>
        </div>

        {!hasKey ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 0', lineHeight: 1.8 }}>
            尚未設定 Anthropic API Key。
            <button
              className="btn btn-sm btn-primary"
              style={{ marginLeft: 10 }}
              onClick={() => setShowKeyModal(true)}>
              立即設定
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {TYPES.map(t => (
                <button
                  key={t.id}
                  className={`ai-type-btn ${activeType === t.id ? 'active' : ''}`}
                  onClick={() => suggest(t.id)}
                  disabled={!!loading}
                  title={t.desc}
                >
                  {loading === t.id ? <Icons.Loader /> : <Icons.Sparkles />}
                  {t.label}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8, padding: '8px 12px', background: '#FDF0EE', borderRadius: 'var(--radius-sm)', border: '1px solid #F0C0BC' }}>
                錯誤：{error}
              </div>
            )}

            {loading && !results[loading] && (
              <div style={{ color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                <Icons.Loader /> AI 分析中，請稍候...
              </div>
            )}

            {activeType && results[activeType] && (
              <div className="ai-result">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  {TYPES.find(t => t.id === activeType)?.label}
                </div>
                <div className="md-preview" dangerouslySetInnerHTML={{ __html: parseMarkdown(results[activeType]) }} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
