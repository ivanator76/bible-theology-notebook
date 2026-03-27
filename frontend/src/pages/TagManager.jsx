import { useState } from 'react';
import { Icons } from '../components/Icons.jsx';

const TAG_COLORS = ["#BA7517","#639922","#854F0B","#1D9E75","#D85A30","#993556","#A32D2D","#534AB7","#0F6E56","#185FA5","#378ADD","#85B7EB","#5DCAA5","#E24B4A","#D4537E","#7F77DD","#D85A30","#993C1D"];

export function TagManager({ data, onUpdate }) {
  const [tab, setTab] = useState("bt");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const tags = tab === "bt" ? data.btTags : data.stTags;
  const tagKey = tab === "bt" ? "btTags" : "stTags";

  const getUsageCount = (tagId) => {
    if (tab === "bt") {
      return data.notes.filter(n => (n.btTags || []).includes(tagId)).length;
    } else {
      const noteUsage = data.notes.filter(n => (n.stTags || []).includes(tagId)).length;
      const linkUsage = (data.doctrineLinks || []).filter(l => l.doctrineId === tagId).length;
      return noteUsage + linkUsage;
    }
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const id = `${tab}-custom-${uid()}`;
    const updated = { ...data, [tagKey]: [...tags, { id, name: newName.trim(), color: newColor }] };
    onUpdate(updated);
    setNewName("");
    setAdding(false);
  };

  const handleDelete = (tagId) => {
    const usage = getUsageCount(tagId);
    if (usage > 0) {
      if (!confirm(`此標籤已被 ${usage} 則筆記/連結使用。刪除後這些筆記將失去此標籤。確定刪除？`)) return;
    } else {
      if (!confirm("確定刪除此標籤？")) return;
    }
    const newTags = tags.filter(t => t.id !== tagId);
    const newData = { ...data, [tagKey]: newTags };
    if (tab === "bt") {
      newData.notes = data.notes.map(n => ({ ...n, btTags: (n.btTags || []).filter(id => id !== tagId) }));
    } else {
      newData.notes = data.notes.map(n => ({ ...n, stTags: (n.stTags || []).filter(id => id !== tagId) }));
      newData.doctrineLinks = (data.doctrineLinks || []).filter(l => l.doctrineId !== tagId);
    }
    onUpdate(newData);
  };

  const startEdit = (tag) => { setEditId(tag.id); setEditName(tag.name); setEditColor(tag.color); };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    const newTags = tags.map(t => t.id === editId ? { ...t, name: editName.trim(), color: editColor } : t);
    onUpdate({ ...data, [tagKey]: newTags });
    setEditId(null);
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">標籤管理 Tags</h2>
      </div>

      <div className="tab-row">
        <div className={`tab ${tab === "bt" ? "active" : ""}`} onClick={() => { setTab("bt"); setAdding(false); setEditId(null); }}>
          聖經神學 Biblical Theology
        </div>
        <div className={`tab ${tab === "st" ? "active" : ""}`} onClick={() => { setTab("st"); setAdding(false); setEditId(null); }}>
          系統神學 Systematic Theology
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>
            <Icons.Tag />
            {tab === "bt" ? "聖經神學主題" : "系統神學教義"} ({tags.length})
          </div>
          {!adding && (
            <button className="btn btn-primary btn-sm" onClick={() => { setAdding(true); setEditId(null); }}>
              <Icons.Plus /> 新增標籤
            </button>
          )}
        </div>

        {adding && (
          <div style={{ background: "var(--bg)", padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: 16 }}>
            <div className="field">
              <label className="label">標籤名稱</label>
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder={tab === "bt" ? "例：安息 Sabbath" : "例：三位一體 Trinity"}
                onKeyDown={e => e.key === "Enter" && handleAdd()} />
            </div>
            <div className="field">
              <label className="label">顏色</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TAG_COLORS.slice(0, 12).map(c => (
                  <div key={c} onClick={() => setNewColor(c)} style={{
                    width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                    border: newColor === c ? "3px solid var(--text)" : "3px solid transparent",
                    transition: "border-color 0.15s",
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>新增</button>
              <button className="btn btn-sm" onClick={() => setAdding(false)}>取消</button>
            </div>
          </div>
        )}

        <div>
          {tags.map(tag => {
            const usage = getUsageCount(tag.id);
            const isEditing = editId === tag.id;

            if (isEditing) {
              return (
                <div key={tag.id} style={{ background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--accent)", marginBottom: 8 }}>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label className="label">名稱</label>
                    <input className="input" value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveEdit()} />
                  </div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label className="label">顏色</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {TAG_COLORS.slice(0, 12).map(c => (
                        <div key={c} onClick={() => setEditColor(c)} style={{
                          width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
                          border: editColor === c ? "3px solid var(--text)" : "3px solid transparent",
                        }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>儲存</button>
                    <button className="btn btn-sm" onClick={() => setEditId(null)}>取消</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={tag.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)", marginBottom: 6,
                background: "var(--surface)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="tag-dot" style={{ background: tag.color, width: 10, height: 10 }} />
                  <span style={{ fontSize: 14 }}>{tag.name}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--bg)", padding: "1px 8px", borderRadius: 10 }}>
                    {usage} 則使用
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn-ghost" onClick={() => startEdit(tag)} title="編輯"><Icons.Edit /></button>
                  <button className="btn-ghost" onClick={() => handleDelete(tag.id)} title="刪除" style={{ color: "var(--danger)" }}><Icons.Trash /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
