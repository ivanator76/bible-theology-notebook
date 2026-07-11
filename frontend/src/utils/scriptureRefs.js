import { BOOK_MAP } from '../data/bibleBooks.js';

// bookId -> recognised names: full Chinese, CUV abbreviation, full English, common English abbreviations.
const ALIASES = {
  gen: ['創世記', '創', 'Genesis', 'Gen'],
  exo: ['出埃及記', '出', 'Exodus', 'Exod', 'Exo'],
  lev: ['利未記', '利', 'Leviticus', 'Lev'],
  num: ['民數記', '民', 'Numbers', 'Num'],
  deu: ['申命記', '申', 'Deuteronomy', 'Deut', 'Deu'],
  jos: ['約書亞記', '書', 'Joshua', 'Josh', 'Jos'],
  jdg: ['士師記', '士', 'Judges', 'Judg', 'Jdg'],
  rut: ['路得記', '得', 'Ruth', 'Rut'],
  '1sa': ['撒母耳記上', '撒上', '1 Samuel', '1Samuel', '1 Sam', '1Sam'],
  '2sa': ['撒母耳記下', '撒下', '2 Samuel', '2Samuel', '2 Sam', '2Sam'],
  '1ki': ['列王紀上', '王上', '1 Kings', '1Kings', '1 Kgs', '1Kgs'],
  '2ki': ['列王紀下', '王下', '2 Kings', '2Kings', '2 Kgs', '2Kgs'],
  '1ch': ['歷代志上', '代上', '1 Chronicles', '1Chronicles', '1 Chr', '1Chr'],
  '2ch': ['歷代志下', '代下', '2 Chronicles', '2Chronicles', '2 Chr', '2Chr'],
  ezr: ['以斯拉記', '拉', 'Ezra', 'Ezr'],
  neh: ['尼希米記', '尼', 'Nehemiah', 'Neh'],
  est: ['以斯帖記', '斯', 'Esther', 'Esth', 'Est'],
  job: ['約伯記', '伯', 'Job'],
  psa: ['詩篇', '詩', 'Psalms', 'Psalm', 'Psa'],
  pro: ['箴言', '箴', 'Proverbs', 'Prov', 'Pro'],
  ecc: ['傳道書', '傳', 'Ecclesiastes', 'Eccl', 'Ecc'],
  sng: ['雅歌', '歌', 'Song of Solomon', 'Song of Songs', 'Song'],
  isa: ['以賽亞書', '賽', 'Isaiah', 'Isa'],
  jer: ['耶利米書', '耶', 'Jeremiah', 'Jer'],
  lam: ['耶利米哀歌', '哀', 'Lamentations', 'Lam'],
  ezk: ['以西結書', '結', 'Ezekiel', 'Ezek', 'Ezk'],
  dan: ['但以理書', '但', 'Daniel', 'Dan'],
  hos: ['何西阿書', '何', 'Hosea', 'Hos'],
  jol: ['約珥書', '珥', 'Joel', 'Joe', 'Jol'],
  amo: ['阿摩司書', '摩', 'Amos', 'Amo'],
  oba: ['俄巴底亞書', '俄', 'Obadiah', 'Obad', 'Oba'],
  jon: ['約拿書', '拿', 'Jonah', 'Jon'],
  mic: ['彌迦書', '彌', 'Micah', 'Mic'],
  nah: ['那鴻書', '鴻', 'Nahum', 'Nah'],
  hab: ['哈巴谷書', '哈', 'Habakkuk', 'Hab'],
  zep: ['西番雅書', '番', 'Zephaniah', 'Zeph', 'Zep'],
  hag: ['哈該書', '該', 'Haggai', 'Hag'],
  zec: ['撒迦利亞書', '亞', 'Zechariah', 'Zech', 'Zec'],
  mal: ['瑪拉基書', '瑪', 'Malachi', 'Mal'],
  mat: ['馬太福音', '太', 'Matthew', 'Matt', 'Mat'],
  mrk: ['馬可福音', '可', 'Mark', 'Mrk'],
  luk: ['路加福音', '路', 'Luke', 'Luk'],
  jhn: ['約翰福音', '約', 'John', 'Jhn'],
  act: ['使徒行傳', '徒', 'Acts', 'Act'],
  rom: ['羅馬書', '羅', 'Romans', 'Rom'],
  '1co': ['哥林多前書', '林前', '1 Corinthians', '1Corinthians', '1 Cor', '1Cor'],
  '2co': ['哥林多後書', '林後', '2 Corinthians', '2Corinthians', '2 Cor', '2Cor'],
  gal: ['加拉太書', '加', 'Galatians', 'Gal'],
  eph: ['以弗所書', '弗', 'Ephesians', 'Eph'],
  php: ['腓立比書', '腓', 'Philippians', 'Phil', 'Php'],
  col: ['歌羅西書', '西', 'Colossians', 'Col'],
  '1th': ['帖撒羅尼迦前書', '帖前', '1 Thessalonians', '1Thessalonians', '1 Thess', '1Thess'],
  '2th': ['帖撒羅尼迦後書', '帖後', '2 Thessalonians', '2Thessalonians', '2 Thess', '2Thess'],
  '1ti': ['提摩太前書', '提前', '1 Timothy', '1Timothy', '1 Tim', '1Tim'],
  '2ti': ['提摩太後書', '提後', '2 Timothy', '2Timothy', '2 Tim', '2Tim'],
  tit: ['提多書', '多', 'Titus', 'Tit'],
  phm: ['腓利門書', '門', 'Philemon', 'Phlm', 'Phm'],
  heb: ['希伯來書', '來', 'Hebrews', 'Heb'],
  jas: ['雅各書', '雅', 'James', 'Jas'],
  '1pe': ['彼得前書', '彼前', '1 Peter', '1Peter', '1 Pet', '1Pet'],
  '2pe': ['彼得後書', '彼後', '2 Peter', '2Peter', '2 Pet', '2Pet'],
  '1jn': ['約翰一書', '約壹', '約一', '1 John', '1John', '1 Jn', '1Jn'],
  '2jn': ['約翰二書', '約貳', '約二', '2 John', '2John', '2 Jn', '2Jn'],
  '3jn': ['約翰三書', '約參', '約三', '3 John', '3John', '3 Jn', '3Jn'],
  jud: ['猶大書', '猶', 'Jude', 'Jud'],
  rev: ['啟示錄', '啟', 'Revelation', 'Rev'],
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Flatten to [alias, bookId], longest alias first so "約翰一書"/"約一" win over "約".
const ENTRIES = [];
for (const [id, names] of Object.entries(ALIASES)) {
  for (const n of names) ENTRIES.push([n, id]);
}
ENTRIES.sort((a, b) => b[0].length - a[0].length);

const ALIAS_TO_ID = {};
for (const [alias, id] of ENTRIES) ALIAS_TO_ID[alias.toLowerCase()] = id;

const ALIAS_PATTERN = ENTRIES.map(([n]) => escapeRegex(n)).join('|');

// Book + chapter:verse, optionally a range. A verse (with colon) is required to
// avoid false positives, since many Chinese abbreviations are common words.
const REF_RE = new RegExp(
  `(${ALIAS_PATTERN})\\s*(\\d+)\\s*[:：]\\s*(\\d+)(?:\\s*[-–~]\\s*(\\d+)(?:\\s*[:：]\\s*(\\d+))?)?`,
  'gi'
);

// Turn an already-HTML-escaped string into one where scripture references are
// wrapped in clickable <span class="scripture-ref"> elements.
export function linkifyScriptureRefs(escapedText) {
  return escapedText.replace(REF_RE, (match, alias, ch, vs, rangeEnd, rangeEndVerse) => {
    const id = ALIAS_TO_ID[alias.toLowerCase()];
    const book = id && BOOK_MAP[id];
    if (!book) return match;
    const chStart = ch;
    const vStart = vs;
    let chEnd = '';
    let vEnd = '';
    if (rangeEnd != null) {
      if (rangeEndVerse != null) { chEnd = rangeEnd; vEnd = rangeEndVerse; }
      else { vEnd = rangeEnd; } // same-chapter verse range, e.g. 3:16-18
    }
    const attrs = `data-book="${id}" data-chs="${chStart}" data-vss="${vStart}" data-che="${chEnd}" data-vse="${vEnd}"`;
    return `<span class="scripture-ref" ${attrs} role="button" tabindex="0">${match}</span>`;
  });
}
