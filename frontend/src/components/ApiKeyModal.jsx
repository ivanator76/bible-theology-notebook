import { useState, useEffect } from 'react';
import { Icons } from './Icons.jsx';

const PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    placeholder: 'sk-ant-api03-...',
    url: 'console.anthropic.com',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    url: 'platform.openai.com',
  },
  {
    id: 'google',
    label: 'Google',
    placeholder: 'AIzaSy...',
    url: 'aistudio.google.com',
  },
];

export function ApiKeyModal({ onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('anthropic');
  const [keys, setKeys] = useState({ anthropic: '', openai: '', google: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d);
      setActiveTab(d.activeProvider || 'anthropic');
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const key = keys[activeTab];
    if (!key.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: activeTab, key: key.trim() }),
      });
      if (!res.ok) throw new Error('儲存失敗');
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await fetch('/api/settings/ai-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: activeTab, key: '' }),
    });
    onSaved();
    load();
  };

  const setActive = async (provider) => {
    await fetch('/api/settings/ai-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    onSaved();
    load();
  };

  const tab = PROVIDERS.find(p => p.id === activeTab);
  const tabInfo = settings?.providers?.[activeTab];
  const isEnv = tabInfo?.source === 'env';
  const isActive = settings?.activeProvider === activeTab;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: 520, maxWidth: '100%', padding: 28 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-zh)', fontSize: 17, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Sparkles /> AI 服務設定
          </h3>
          <button className="btn-ghost" onClick={onClose}><Icons.X /></button>
        </div>

        {/* Provider tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {PROVIDERS.map(p => {
            const pInfo = settings?.providers?.[p.id];
            const pActive = settings?.activeProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                style={{
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: activeTab === p.id ? 700 : 400,
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === p.id ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeTab === p.id ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: -1,
                }}
              >
                {p.label}
                {pInfo?.hasKey && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: pActive ? 'var(--accent)' : '#aaa',
                    display: 'inline-block',
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Active provider badge */}
        {settings && (
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {isActive ? (
              <span style={{ fontSize: 12, background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 99, padding: '3px 10px', fontWeight: 600 }}>
                ✓ 目前使用中
              </span>
            ) : tabInfo?.hasKey ? (
              <button
                className="btn btn-sm"
                onClick={() => setActive(activeTab)}
                style={{ fontSize: 12 }}
              >
                切換為使用此服務
              </button>
            ) : null}
          </div>
        )}

        {/* Env var notice */}
        {isEnv && (
          <div style={{ background: 'var(--st-bg)', border: '1px solid var(--st-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            此服務的 API Key 由環境變數提供，無法在介面修改。
          </div>
        )}

        {/* Current key */}
        {tabInfo?.maskedKey && tabInfo.source === 'file' && (
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--bt-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <span style={{ color: 'var(--muted)' }}>已儲存的 Key：</span>
            <code style={{ marginLeft: 6, color: 'var(--accent2)', fontWeight: 600 }}>{tabInfo.maskedKey}</code>
          </div>
        )}

        {/* Hint */}
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.8 }}>
          請前往{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{tab?.url}</span>{' '}
          取得 {tab?.label} API Key。<br />
          Key 僅儲存於本機，不會上傳至任何外部伺服器。
        </p>

        <div className="field">
          <label className="label">
            {tabInfo?.maskedKey ? '輸入新的 API Key（留空則不更新）' : 'API Key'}
          </label>
          <input
            className="input"
            type="password"
            value={keys[activeTab]}
            onChange={e => setKeys(prev => ({ ...prev, [activeTab]: e.target.value }))}
            placeholder={tab?.placeholder}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            disabled={isEnv}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          {tabInfo?.hasKey && tabInfo.source === 'file' && (
            <button className="btn btn-sm btn-danger" onClick={remove} style={{ marginRight: 'auto' }}>
              移除 Key
            </button>
          )}
          <button className="btn btn-sm" onClick={onClose}>取消</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={saving || !keys[activeTab].trim() || isEnv}
          >
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}
