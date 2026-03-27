import { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { BOOK_MAP, BOOK_ORDER } from '../data/bibleBooks.js';

export function NetworkGraph({ data, onNavigate }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [filterChain, setFilterChain] = useState("");
  const [dimensions, setDimensions] = useState({ width: 600, height: 380 });

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();
    const { notes, resources = [], stTags, doctrineLinks = [], resourceLinks = [], themeChains = [] } = data;

    const chainNoteIds = filterChain
      ? new Set((themeChains.find(c => c.id === filterChain)?.noteIds || []))
      : null;

    notes.forEach(n => {
      if (chainNoteIds && !chainNoteIds.has(n.id)) return;
      const book = BOOK_MAP[n.bookId];
      const label = book ? `${book.zh} ${n.chapterStart || ""}` : n.id;
      nodes.push({ id: `n:${n.id}`, type: "note", label, title: n.title || label, noteId: n.id });
      nodeSet.add(`n:${n.id}`);
    });

    doctrineLinks.forEach(l => {
      if (!nodeSet.has(`n:${l.noteId}`)) return;
      const docId = `d:${l.doctrineId}`;
      if (!nodeSet.has(docId)) {
        const tag = stTags.find(t => t.id === l.doctrineId);
        if (tag) {
          nodes.push({ id: docId, type: "doctrine", label: tag.name.split(" ")[0], title: tag.name, doctrineId: l.doctrineId });
          nodeSet.add(docId);
        }
      }
      if (nodeSet.has(docId)) links.push({ source: `n:${l.noteId}`, target: docId });
    });

    resourceLinks.forEach(l => {
      if (!nodeSet.has(`n:${l.noteId}`)) return;
      const resId = `r:${l.resourceId}`;
      if (!nodeSet.has(resId)) {
        const res = resources.find(r => r.id === l.resourceId);
        if (res) {
          nodes.push({ id: resId, type: "resource", label: res.title.length > 12 ? res.title.slice(0, 12) + "…" : res.title, title: res.title });
          nodeSet.add(resId);
        }
      }
      if (nodeSet.has(resId)) links.push({ source: `n:${l.noteId}`, target: resId });
    });

    const chainsToShow = filterChain ? themeChains.filter(c => c.id === filterChain) : themeChains;
    chainsToShow.forEach(chain => {
      const sorted = (chain.noteIds || [])
        .filter(id => nodeSet.has(`n:${id}`))
        .map(id => notes.find(n => n.id === id))
        .filter(Boolean)
        .sort((a, b) => (BOOK_ORDER[a.bookId] ?? 999) - (BOOK_ORDER[b.bookId] ?? 999));
      for (let i = 0; i < sorted.length - 1; i++) {
        links.push({ source: `n:${sorted[i].id}`, target: `n:${sorted[i + 1].id}`, chain: true });
      }
    });

    (data.crossRefs || []).forEach(ref => {
      if (nodeSet.has(`n:${ref.fromId}`) && nodeSet.has(`n:${ref.toId}`)) {
        links.push({ source: `n:${ref.fromId}`, target: `n:${ref.toId}`, crossRef: true });
      }
    });

    return { nodes, links };
  }, [data, filterChain]);

  const colorMap = { note: "#9E7B4F", doctrine: "#378ADD", resource: "#D85A30" };
  const radiusMap = { note: 6, doctrine: 10, resource: 8 };

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = svgRef.current;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const w = dimensions.width;
    const h = dimensions.height;

    const nodesCopy = graphData.nodes.map(d => ({ ...d }));
    const linksCopy = graphData.links.map(d => ({ ...d }));

    if (simRef.current) simRef.current.stop();

    const sim = simRef.current = d3.forceSimulation(nodesCopy)
      .force("link", d3.forceLink(linksCopy).id(d => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(d => radiusMap[d.type] + 4));

    sim.on("tick", () => drawGraph(svg, nodesCopy, linksCopy, w, h));

    return () => { if (simRef.current) simRef.current.stop(); };
  }, [graphData, dimensions]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 100) setDimensions({ width, height: 380 });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  function drawGraph(svg, nodes, links, w, h) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ns = "http://www.w3.org/2000/svg";

    links.forEach(l => {
      if (!l.source?.x || !l.target?.x) return;
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", l.source.x);
      line.setAttribute("y1", l.source.y);
      line.setAttribute("x2", l.target.x);
      line.setAttribute("y2", l.target.y);
      if (l.chain) {
        line.setAttribute("stroke", "#1D9E75");
        line.setAttribute("stroke-width", "1.5");
        line.setAttribute("stroke-opacity", "0.6");
        line.setAttribute("stroke-dasharray", "4 3");
      } else if (l.crossRef) {
        line.setAttribute("stroke", "#7F77DD");
        line.setAttribute("stroke-width", "1.5");
        line.setAttribute("stroke-opacity", "0.6");
        line.setAttribute("stroke-dasharray", "2 2");
      } else {
        line.setAttribute("stroke", "var(--border2)");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-opacity", "0.5");
      }
      svg.appendChild(line);
    });

    nodes.forEach(n => {
      if (!n.x || !n.y) return;
      const cx = Math.max(12, Math.min(w - 12, n.x));
      const cy = Math.max(12, Math.min(h - 12, n.y));

      const g = document.createElementNS(ns, "g");
      g.style.cursor = "pointer";

      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", cx);
      circle.setAttribute("cy", cy);
      circle.setAttribute("r", radiusMap[n.type]);
      circle.setAttribute("fill", colorMap[n.type]);
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "1.5");
      g.appendChild(circle);

      if (n.type !== "note" || nodes.length < 30) {
        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", cx);
        text.setAttribute("y", cy + radiusMap[n.type] + 12);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "var(--muted)");
        text.setAttribute("font-size", "10");
        text.setAttribute("font-family", "-apple-system, sans-serif");
        text.textContent = n.label;
        g.appendChild(text);
      }

      g.addEventListener("mouseenter", (e) => {
        circle.setAttribute("r", radiusMap[n.type] + 3);
        circle.setAttribute("stroke-width", "2.5");
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10, text: n.title });
        }
      });
      g.addEventListener("mouseleave", () => {
        circle.setAttribute("r", radiusMap[n.type]);
        circle.setAttribute("stroke-width", "1.5");
        setTooltip(null);
      });
      g.addEventListener("click", () => {
        if (n.type === "note" && n.noteId) onNavigate("view-note", { noteId: n.noteId });
        if (n.type === "doctrine") onNavigate("doctrines");
        if (n.type === "resource") onNavigate("resources");
      });

      svg.appendChild(g);
    });
  }

  const hasData = graphData.nodes.length > 0;
  const chains = data.themeChains || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorMap.note, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>筆記</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorMap.doctrine, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>系統神學教義</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorMap.resource, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>外部資料</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 0, borderTop: "2px dashed #1D9E75", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>追蹤鏈</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 16, height: 0, borderTop: "2px dotted #7F77DD", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>交叉引用</span>
          </div>
        </div>
        {chains.length > 0 && (
          <select className="select" style={{ width: "auto", minWidth: 140, fontSize: 12 }} value={filterChain} onChange={e => setFilterChain(e.target.value)}>
            <option value="">所有筆記</option>
            {chains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      <div ref={containerRef} style={{ position: "relative", background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", overflow: "hidden" }}>
        {!hasData ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
            建立筆記並連結教義或外部資料後，關聯圖將在此顯示
          </div>
        ) : (
          <svg ref={svgRef} width={dimensions.width} height={dimensions.height} style={{ display: "block" }} />
        )}
        {tooltip && (
          <div style={{
            position: "absolute", left: tooltip.x, top: tooltip.y,
            transform: "translateX(-50%) translateY(-100%)",
            background: "var(--text)", color: "var(--bg)",
            padding: "4px 10px", borderRadius: 4, fontSize: 11,
            whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10,
          }}>
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}
