import { useState, useEffect, useCallback } from 'react';
import { useTheme } from './hooks/useTheme.js';
import { Icons } from './components/Icons.jsx';
import { GlobalSearch } from './components/GlobalSearch.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { NotesList } from './pages/NotesList.jsx';
import { NoteEditor } from './pages/NoteEditor.jsx';
import { NoteView } from './pages/NoteView.jsx';
import { DoctrinePage } from './pages/DoctrinePage.jsx';
import { ThemeChainPage } from './pages/ThemeChainPage.jsx';
import { ResourcesPage } from './pages/ResourcesPage.jsx';
import { TagManager } from './pages/TagManager.jsx';

const API = async (path, options = {}) => {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
};

async function fetchAllData() {
  const [notes, tagsData, doctrineLinks, resources, resourceLinks, themeChains, crossRefs] = await Promise.all([
    API('/api/notes'),
    API('/api/tags'),
    API('/api/doctrine-links'),
    API('/api/resources'),
    API('/api/resource-links'),
    API('/api/theme-chains'),
    API('/api/cross-refs'),
  ]);
  return {
    notes,
    btTags: tagsData.btTags,
    stTags: tagsData.stTags,
    doctrineLinks,
    resources,
    resourceLinks,
    themeChains,
    crossRefs,
  };
}

export default function App() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [pageParams, setPageParams] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { darkMode, toggleDark } = useTheme();

  useEffect(() => {
    fetchAllData().then(d => { setData(d); setLoading(false); }).catch(e => {
      console.error('Failed to load data:', e);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowSearch(s => !s); }
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigate = useCallback((pg, params = {}) => {
    setPage(pg); setPageParams(params); setSidebarOpen(false);
  }, []);

  // Smart persist: diffs old vs new data and calls appropriate API endpoints
  const persist = useCallback(async (newData) => {
    setData(newData);
    if (!data) return;

    try {
      // Diff resourceLinks
      const oldRL = data.resourceLinks || [], newRL = newData.resourceLinks || [];
      for (const lnk of newRL) {
        if (!oldRL.some(l => l.noteId === lnk.noteId && l.resourceId === lnk.resourceId))
          await fetch('/api/resource-links', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(lnk) });
      }
      for (const lnk of oldRL) {
        if (!newRL.some(l => l.noteId === lnk.noteId && l.resourceId === lnk.resourceId))
          await fetch('/api/resource-links', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify(lnk) });
      }

      // Diff crossRefs
      const oldCR = data.crossRefs || [], newCR = newData.crossRefs || [];
      for (const ref of newCR) {
        if (!oldCR.find(r => r.id === ref.id))
          await fetch('/api/cross-refs', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(ref) });
      }
      for (const ref of oldCR) {
        if (!newCR.find(r => r.id === ref.id))
          await fetch(`/api/cross-refs/${ref.id}`, { method: 'DELETE' });
      }

      // Diff resources
      const oldRes = data.resources || [], newRes = newData.resources || [];
      for (const res of newRes) {
        const old = oldRes.find(r => r.id === res.id);
        if (!old) await fetch('/api/resources', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(res) });
        else if (JSON.stringify(old) !== JSON.stringify(res)) await fetch(`/api/resources/${res.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(res) });
      }
      for (const res of oldRes) {
        if (!newRes.find(r => r.id === res.id)) await fetch(`/api/resources/${res.id}`, { method: 'DELETE' });
      }

      // Diff themeChains
      const oldChains = data.themeChains || [], newChains = newData.themeChains || [];
      for (const chain of newChains) {
        const old = oldChains.find(c => c.id === chain.id);
        if (!old) await fetch('/api/theme-chains', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(chain) });
        else if (JSON.stringify(old) !== JSON.stringify(chain)) await fetch(`/api/theme-chains/${chain.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(chain) });
      }
      for (const chain of oldChains) {
        if (!newChains.find(c => c.id === chain.id)) await fetch(`/api/theme-chains/${chain.id}`, { method: 'DELETE' });
      }

      // Diff btTags
      if (JSON.stringify(data.btTags) !== JSON.stringify(newData.btTags))
        await fetch('/api/tags/bt', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(newData.btTags) });

      // Diff stTags
      if (JSON.stringify(data.stTags) !== JSON.stringify(newData.stTags))
        await fetch('/api/tags/st', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(newData.stTags) });

      // Diff notes (for tag deletion cascade - TagManager modifies notes)
      const oldNotes = data.notes || [], newNotes = newData.notes || [];
      for (const note of newNotes) {
        const old = oldNotes.find(n => n.id === note.id);
        if (old && JSON.stringify(old) !== JSON.stringify(note))
          await fetch(`/api/notes/${note.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(note) });
      }
    } catch (e) { console.error('Persist error:', e); }
  }, [data]);

  const handleSaveNote = useCallback(async (note, docLinks) => {
    const isNew = !data.notes.find(n => n.id === note.id);
    try {
      if (isNew) await fetch('/api/notes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(note) });
      else await fetch(`/api/notes/${note.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(note) });
      await fetch(`/api/doctrine-links/${note.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(docLinks) });

      const newData = { ...data };
      const idx = newData.notes.findIndex(n => n.id === note.id);
      if (idx >= 0) newData.notes[idx] = note; else newData.notes.push(note);
      newData.doctrineLinks = (newData.doctrineLinks || []).filter(l => l.noteId !== note.id);
      docLinks.forEach(dl => newData.doctrineLinks.push({ noteId: note.id, doctrineId: dl.doctrineId, annotation: dl.annotation }));
      setData(newData);
      navigate("view-note", { noteId: note.id });
    } catch (e) { console.error('Save note error:', e); alert('儲存失敗，請稍後重試'); }
  }, [data, navigate]);

  const handleDeleteNote = useCallback(async (noteId) => {
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      const newData = {
        ...data,
        notes: data.notes.filter(n => n.id !== noteId),
        doctrineLinks: (data.doctrineLinks || []).filter(l => l.noteId !== noteId),
        resourceLinks: (data.resourceLinks || []).filter(l => l.noteId !== noteId),
        crossRefs: (data.crossRefs || []).filter(r => r.fromId !== noteId && r.toId !== noteId),
        themeChains: (data.themeChains || []).map(c => ({ ...c, noteIds: (c.noteIds || []).filter(id => id !== noteId) })),
      };
      setData(newData);
      navigate("notes");
    } catch (e) { console.error('Delete note error:', e); alert('刪除失敗，請稍後重試'); }
  }, [data, navigate]);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bible-notebook-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('匯出失敗'); }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (imported.notes && Array.isArray(imported.notes)) {
          if (confirm(`確定匯入？將覆蓋現有資料（${imported.notes.length} 則筆記）`)) {
            await fetch('/api/import', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(imported) });
            const fresh = await fetchAllData();
            setData(fresh);
            navigate("dashboard");
          }
        } else { alert("檔案格式不正確"); }
      } catch { alert("檔案讀取失敗"); }
    };
    input.click();
  };

  if (loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "var(--font-zh)", color: "var(--muted)" }}>
        載入中...
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", icon: <Icons.Home />, label: "Dashboard 總覽" },
    { id: "notes", icon: <Icons.FileText />, label: "筆記 Notes" },
    { id: "chains", icon: <Icons.Layers />, label: "追蹤鏈 Chains" },
    { id: "resources", icon: <Icons.Globe />, label: "外部資料 Resources" },
    { id: "doctrines", icon: <Icons.Chain />, label: "教義 Doctrines" },
    { id: "tags", icon: <Icons.Tag />, label: "標籤管理 Tags" },
  ];

  const activePage = ["view-note", "edit-note", "new-note"].includes(page) ? "notes" : page;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard data={data} onNavigate={navigate} />;
      case "notes": return <NotesList data={data} onNavigate={navigate} initialFilter={pageParams} />;
      case "new-note": return <NoteEditor data={data} onSave={handleSaveNote} onCancel={() => navigate("notes")} onNavigate={navigate} />;
      case "edit-note": return <NoteEditor data={data} noteId={pageParams.noteId} onSave={handleSaveNote} onCancel={() => navigate("view-note", { noteId: pageParams.noteId })} onNavigate={navigate} />;
      case "view-note": return <NoteView data={data} noteId={pageParams.noteId} onNavigate={navigate} onDelete={handleDeleteNote} onUpdate={persist} />;
      case "doctrines": return <DoctrinePage data={data} onNavigate={navigate} />;
      case "chains": return <ThemeChainPage data={data} onUpdate={persist} onNavigate={navigate} initialChainId={pageParams.chainId} />;
      case "resources": return <ResourcesPage data={data} onUpdate={persist} onNavigate={navigate} />;
      case "tags": return <TagManager data={data} onUpdate={persist} />;
      default: return <Dashboard data={data} onNavigate={navigate} />;
    }
  };

  return (
    <div className={`app-root ${darkMode ? "dark" : ""}`}>
      {showSearch && <GlobalSearch data={data} onNavigate={navigate} onClose={() => setShowSearch(false)} />}
      <div className={`overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />

      <div className="mobile-header">
        <button className="btn-ghost" onClick={() => setSidebarOpen(true)}><Icons.Menu /></button>
        <h1>聖經神學筆記</h1>
        <button className="btn btn-primary btn-sm" onClick={() => navigate("new-note")}><Icons.Plus /></button>
      </div>

      <nav className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>聖經神學筆記</h1>
          <p>Bible Theology Notebook</p>
        </div>
        <div style={{ padding: "0 12px 8px", display: "flex", gap: 6 }}>
          <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowSearch(true)}>
            <Icons.Search /> 搜尋
          </button>
          <button className="btn btn-sm btn-ghost" onClick={toggleDark} title={darkMode ? "切換亮色" : "切換深色"}>
            {darkMode ? <Icons.Sun /> : <Icons.Moon />}
          </button>
        </div>
        {navItems.map(item => (
          <div key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>
            {item.icon}{item.label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => navigate("new-note")}>
            <Icons.Plus /> 新增筆記
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={handleExport}>匯出備份</button>
            <button className="btn btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={handleImport}>匯入還原</button>
          </div>
        </div>
      </nav>

      <div className="main">{renderPage()}</div>
    </div>
  );
}
