import { BIBLE_BOOKS } from '../data/bibleBooks.js';

export function BookSelector({ value, onChange }) {
  return (
    <select className="select" value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">選擇書卷 Select a book...</option>
      {BIBLE_BOOKS.map(g => (
        <optgroup key={g.group} label={g.group}>
          {g.books.map(b => (
            <option key={b.id} value={b.id}>{b.zh} {b.en}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
