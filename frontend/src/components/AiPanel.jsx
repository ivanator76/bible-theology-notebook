import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icons } from './Icons.jsx';
import { ApiKeyModal } from './ApiKeyModal.jsx';

const TYPES = [
  { id: 'related_scriptures', label: '建議相關經文', desc: '找出主題相近的其他經文段落' },
  { id: 'doctrine_links', label: '建議教義連結', desc: '分析可連結的系統神學教義' },
  { id: 'research_directions', label: '延伸研究方向', desc: '建議下一步可以探索的方向' },
];
const PROVIDER_LABELS = { anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', openrouter: 'OpenRouter' };

function relatedNoteFor(item, notes, currentNoteId) {
  return notes.find(note => note.id !== currentNoteId && note.bookId === item.bookId
    && parseInt(note.chapterStart, 10) <= parseInt(item.chapterEnd || item.chapterStart, 10)
    && parseInt(note.chapterEnd || note.chapterStart, 10) >= parseInt(item.chapterStart, 10));
}

export function AiPanel({ note, btTags, stTags, allNotes = [], onRefresh, onNavigate }) {
  const [status, setStatus] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [error, setError] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const checkKey = useCallback(() => fetch('/api/ai/status').then(r => r.json()).then(setStatus).catch(() => setStatus({ hasKey: false })), []);
  const loadSaved = useCallback(() => fetch(`/api/ai/note/${note.id}`).then(r => r.json()).then(rows => {
    setSuggestions(rows);
    setActiveType(current => current || rows[0]?.type || null);
  }), [note.id]);

  useEffect(() => { checkKey(); loadSaved(); }, [checkKey, loadSaved]);
  const activeSuggestion = suggestions.find(item => item.type === activeType);

  const suggest = async type => {
    if (loading || !status?.hasKey) return;
    setLoading(type); setActiveType(type); setError(null);
    let scripture = null;
    if (note.bookId && note.chapterStart) {
      const lines = [];
      for (let ch = parseInt(note.chapterStart, 10); ch <= parseInt(note.chapterEnd || note.chapterStart, 10); ch += 1) {
        const cached = sessionStorage.getItem(`${note.bookId}-${ch}`);
        if (cached) {
          const value = JSON.parse(cached);
          if (value.zh) lines.push(...value.zh.map(verse => `${verse.verse} ${verse.text}`));
        }
      }
      if (lines.length) scripture = lines.join('\n');
    }
    try {
      const response = await fetch('/api/ai/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        type, noteId: note.id,
        note: { ref: `${note.bookId} ${note.chapterStart}${note.chapterEnd && note.chapterEnd !== note.chapterStart ? `-${note.chapterEnd}` : ''}${note.verseStart ? `:${note.verseStart}${note.verseEnd ? `-${note.verseEnd}` : ''}` : ''}`, title: note.title || '', content: note.content || '' },
        btTags: btTags.map(tag => tag.name), stTags: stTags.map(tag => `${tag.id}: ${tag.name}`), scripture,
      }) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || `錯誤 ${response.status}`);
      if (value.suggestion) setSuggestions(previous => [value.suggestion, ...previous]);
    } catch (err) { setError(err.message); }
    finally { setLoading(null); }
  };

  const actOnItem = async (suggestion, index, action, targetNoteId) => {
    setError(null);
    const response = await fetch(`/api/ai/suggestions/${suggestion.id}/items/${index}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, targetNoteId }),
    });
    const value = await response.json();
    if (!response.ok) { setError(value.error || '更新建議失敗'); return; }
    setSuggestions(previous => previous.map(item => item.id === value.id ? value : item));
    if (action === 'adopt') await onRefresh?.();
  };

  const renderItem = (suggestion, item, index) => {
    const target = suggestion.type === 'related_scriptures' ? relatedNoteFor(item, allNotes, note.id) : null;
    const title = suggestion.type === 'related_scriptures' ? item.reference
      : suggestion.type === 'doctrine_links' ? (item.doctrineName || item.doctrineId) : item.title;
    const body = suggestion.type === 'related_scriptures' ? item.reason
      : suggestion.type === 'doctrine_links' ? `${item.annotation || ''}${item.contribution ? `\n${item.contribution}` : ''}`
        : `${item.question || ''}${item.nextStep ? `\n下一步：${item.nextStep}` : ''}`;
    return (
      <div className={`ai-suggestion-card ${item.status || 'pending'}`} key={index}>
        <div className="ai-suggestion-copy"><strong>{title || 'AI 建議'}</strong><p>{body}</p></div>
        <div className="ai-suggestion-actions">
          {item.status === 'pending' ? <>
            {suggestion.type === 'related_scriptures' && target && <button className="btn btn-sm" onClick={() => onNavigate?.('view-note', { noteId: target.id })}>已有筆記</button>}
            <button className="btn btn-sm btn-primary" disabled={suggestion.type === 'related_scriptures' && !target}
              title={!target && suggestion.type === 'related_scriptures' ? '這段經文尚無筆記，請先在讀經模式新增' : '寫入知識庫'}
              onClick={() => actOnItem(suggestion, index, 'adopt', target?.id)}>採納</button>
            <button className="btn btn-sm" onClick={() => actOnItem(suggestion, index, 'ignore')}>忽略</button>
          </> : <span className={`ai-status ${item.status}`}>{item.status === 'adopted' ? '已採納' : '已忽略'}</span>}
        </div>
      </div>
    );
  };

  if (status === null) return null;
  return (
    <>
      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} onSaved={() => { checkKey(); setError(null); }} />}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="ai-panel-heading">
          <div className="card-title" style={{ margin: 0 }}><Icons.Sparkles /> AI 輔助分析
            {status.provider && status.hasKey && <span className="ai-provider" title={status.model || ''}>
              {PROVIDER_LABELS[status.provider] || status.provider}{status.model ? ` · ${status.model.split('/').pop()}` : ''}
            </span>}
          </div>
          <button className="btn-ghost" onClick={() => setShowKeyModal(true)}><Icons.Edit /> API Key</button>
        </div>
        {!status.hasKey && <div className="ai-key-notice">尚未設定 AI API Key；已儲存的分析仍可查看。<button className="btn btn-sm btn-primary" onClick={() => setShowKeyModal(true)}>立即設定</button></div>}
        <div className="ai-type-row">
          {TYPES.map(type => {
            const cached = suggestions.find(item => item.type === type.id);
            return <button key={type.id} className={`ai-type-btn ${activeType === type.id ? 'active' : ''}`}
              onClick={() => cached ? setActiveType(type.id) : suggest(type.id)} disabled={!!loading || (!cached && !status.hasKey)} title={type.desc}>
              {loading === type.id ? <Icons.Loader /> : <Icons.Sparkles />}{type.label}{cached && <span className="ai-cached-dot" />}
            </button>;
          })}
        </div>
        {error && <div className="ai-error">錯誤：{error}</div>}
        {loading && <div className="ai-loading"><Icons.Loader /> AI 分析中，請稍候…</div>}
        {activeSuggestion && (
          <div className="ai-result">
            <div className="ai-result-header"><div><strong>{TYPES.find(type => type.id === activeSuggestion.type)?.label}</strong><span>{new Date(activeSuggestion.createdAt).toLocaleString('zh-TW')} · 已持久保存</span></div>
              {status.hasKey && <button className="btn btn-sm" onClick={() => suggest(activeSuggestion.type)}>重新分析</button>}
            </div>
            {activeSuggestion.result?.summary && <p className="ai-summary">{activeSuggestion.result.summary}</p>}
            {activeSuggestion.result?.items?.map((item, index) => renderItem(activeSuggestion, item, index))}
            {!activeSuggestion.result?.items?.length && <pre className="ai-raw-result">{activeSuggestion.rawText || activeSuggestion.result?.rawText || '沒有可顯示的結構化結果'}</pre>}
          </div>
        )}
      </div>
    </>
  );
}
