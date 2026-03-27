import { BOOK_MAP } from '../data/bibleBooks.js';

export function getBookRef(bookId, chStart, chEnd, vStart, vEnd) {
  const b = BOOK_MAP[bookId];
  if (!b) return "";
  let ref = `${b.zh} ${b.en}`;
  if (chStart) {
    ref += ` ${chStart}`;
    if (vStart) ref += `:${vStart}`;
    if (chEnd && chEnd !== chStart) {
      ref += `-${chEnd}`;
      if (vEnd) ref += `:${vEnd}`;
    } else if (vEnd && vEnd !== vStart) {
      ref += `-${vEnd}`;
    }
  }
  return ref;
}
