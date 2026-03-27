import { useState } from 'react';
import { Icons } from './Icons.jsx';

export function DoctrineLinkEditor({ links, stTags, onChange }) {
  const [adding, setAdding] = useState(false);
  const [selDoc, setSelDoc] = useState("");
  const [annotation, setAnnotation] = useState("");

  const addLink = () => {
    if (!selDoc || !annotation.trim()) return;
    onChange([...links, { doctrineId: selDoc, annotation: annotation.trim() }]);
    setSelDoc("");
    setAnnotation("");
    setAdding(false);
  };

  const removeLink = (i) => onChange(links.filter((_, idx) => idx !== i));

  return (
    <div>
      {links.map((lnk, i) => {
        const doc = stTags.find(t => t.id === lnk.doctrineId);
        return (
          <div key={i} className="doctrine-link-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="doctrine-link-tag">{doc ? doc.name : lnk.doctrineId}</span>
              <button className="btn-ghost" onClick={() => removeLink(i)}><Icons.X /></button>
            </div>
            <div className="doctrine-link-note">{lnk.annotation}</div>
          </div>
        );
      })}
      {adding ? (
        <div style={{ background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
          <div className="field">
            <label className="label">系統神學教義</label>
            <select className="select" value={selDoc} onChange={e => setSelDoc(e.target.value)}>
              <option value="">選擇教義...</option>
              {stTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">註解：此經文如何貢獻於此教義？</label>
            <input className="input" value={annotation} onChange={e => setAnnotation(e.target.value)} placeholder="例：逾越節羔羊的替代性死亡，預表基督代贖的核心邏輯" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={addLink}>新增</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>取消</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-sm" onClick={() => setAdding(true)} style={{ marginTop: 4 }}>
          <Icons.Plus /> 連結系統神學教義
        </button>
      )}
    </div>
  );
}
