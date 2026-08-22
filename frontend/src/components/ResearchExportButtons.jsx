import { useState } from 'react';
import { Icons } from './Icons.jsx';

const FORMATS = [
  ['markdown', 'Markdown', 'md'],
  ['docx', 'Word', 'docx'],
  ['pdf', 'PDF', 'pdf'],
];

export function ResearchExportButtons({ kind, id, filename = 'bible-research' }) {
  const [loading, setLoading] = useState(null);
  const download = async (format, extension) => {
    if (!id || loading) return;
    setLoading(format);
    try {
      const response = await fetch(`/api/research-export/${kind}/${encodeURIComponent(id)}?format=${format}`);
      if (!response.ok) {
        const value = await response.json().catch(() => ({}));
        throw new Error(value.error || '匯出失敗');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${filename.replace(/[\\/:*?"<>|]/g, '-')}.${extension}`; link.click();
      URL.revokeObjectURL(url);
    } catch (error) { alert(error.message); }
    finally { setLoading(null); }
  };
  return (
    <div className="research-export-buttons">
      <span><Icons.FileText /> 匯出研究</span>
      {FORMATS.map(([format, label, extension]) => (
        <button key={format} className="btn btn-sm" disabled={!!loading} onClick={() => download(format, extension)}>
          {loading === format ? <Icons.Loader /> : null}{label}
        </button>
      ))}
    </div>
  );
}
