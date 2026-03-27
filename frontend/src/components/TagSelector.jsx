import { useState } from 'react';
import { TagPill } from './TagPill.jsx';

export function TagSelector({ btTags, stTags, selectedBt, selectedSt, onToggleBt, onToggleSt, onGoToTags }) {
  const [tab, setTab] = useState("bt");
  return (
    <div>
      <div className="tab-row">
        <div className={`tab ${tab === "bt" ? "active" : ""}`} onClick={() => setTab("bt")}>
          聖經神學 Biblical
        </div>
        <div className={`tab ${tab === "st" ? "active" : ""}`} onClick={() => setTab("st")}>
          系統神學 Systematic
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tab === "bt" && btTags.map(t => (
          <TagPill key={t.id} tag={t} type="bt" selected={selectedBt.includes(t.id)} onClick={() => onToggleBt(t.id)} />
        ))}
        {tab === "st" && stTags.map(t => (
          <TagPill key={t.id} tag={t} type="st" selected={selectedSt.includes(t.id)} onClick={() => onToggleSt(t.id)} />
        ))}
      </div>
      {onGoToTags && (
        <div style={{ marginTop: 10 }}>
          <span onClick={onGoToTags} style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}>
            管理標籤（新增 / 編輯 / 刪除）→
          </span>
        </div>
      )}
    </div>
  );
}
