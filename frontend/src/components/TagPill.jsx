export function TagPill({ tag, type, selected, onClick, removable, onRemove }) {
  return (
    <span
      className={`tag-pill ${type} ${selected ? "selected" : ""}`}
      onClick={onClick}
      style={{ opacity: selected === false ? 0.5 : 1 }}
    >
      <span className="tag-dot" style={{ background: tag.color }} />
      {tag.name}
      {removable && (
        <span onClick={e => { e.stopPropagation(); onRemove(); }} style={{ marginLeft: 2, cursor: "pointer", opacity: 0.6 }}>&times;</span>
      )}
    </span>
  );
}
