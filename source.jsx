import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as d3 from "d3";

const BIBLE_BOOKS = [
  { group: "律法書 Pentateuch", testament: "OT", books: [
    { id: "gen", zh: "創世記", en: "Genesis", ch: 50 },
    { id: "exo", zh: "出埃及記", en: "Exodus", ch: 40 },
    { id: "lev", zh: "利未記", en: "Leviticus", ch: 27 },
    { id: "num", zh: "民數記", en: "Numbers", ch: 36 },
    { id: "deu", zh: "申命記", en: "Deuteronomy", ch: 34 },
  ]},
  { group: "歷史書 Historical", testament: "OT", books: [
    { id: "jos", zh: "約書亞記", en: "Joshua", ch: 24 },
    { id: "jdg", zh: "士師記", en: "Judges", ch: 21 },
    { id: "rut", zh: "路得記", en: "Ruth", ch: 4 },
    { id: "1sa", zh: "撒母耳記上", en: "1 Samuel", ch: 31 },
    { id: "2sa", zh: "撒母耳記下", en: "2 Samuel", ch: 24 },
    { id: "1ki", zh: "列王紀上", en: "1 Kings", ch: 22 },
    { id: "2ki", zh: "列王紀下", en: "2 Kings", ch: 25 },
    { id: "1ch", zh: "歷代志上", en: "1 Chronicles", ch: 29 },
    { id: "2ch", zh: "歷代志下", en: "2 Chronicles", ch: 36 },
    { id: "ezr", zh: "以斯拉記", en: "Ezra", ch: 10 },
    { id: "neh", zh: "尼希米記", en: "Nehemiah", ch: 13 },
    { id: "est", zh: "以斯帖記", en: "Esther", ch: 10 },
  ]},
  { group: "詩歌智慧書 Poetry & Wisdom", testament: "OT", books: [
    { id: "job", zh: "約伯記", en: "Job", ch: 42 },
    { id: "psa", zh: "詩篇", en: "Psalms", ch: 150 },
    { id: "pro", zh: "箴言", en: "Proverbs", ch: 31 },
    { id: "ecc", zh: "傳道書", en: "Ecclesiastes", ch: 12 },
    { id: "sng", zh: "雅歌", en: "Song of Solomon", ch: 8 },
  ]},
  { group: "大先知書 Major Prophets", testament: "OT", books: [
    { id: "isa", zh: "以賽亞書", en: "Isaiah", ch: 66 },
    { id: "jer", zh: "耶利米書", en: "Jeremiah", ch: 52 },
    { id: "lam", zh: "耶利米哀歌", en: "Lamentations", ch: 5 },
    { id: "ezk", zh: "以西結書", en: "Ezekiel", ch: 48 },
    { id: "dan", zh: "但以理書", en: "Daniel", ch: 12 },
  ]},
  { group: "小先知書 Minor Prophets", testament: "OT", books: [
    { id: "hos", zh: "何西阿書", en: "Hosea", ch: 14 },
    { id: "jol", zh: "約珥書", en: "Joel", ch: 3 },
    { id: "amo", zh: "阿摩司書", en: "Amos", ch: 9 },
    { id: "oba", zh: "俄巴底亞書", en: "Obadiah", ch: 1 },
    { id: "jon", zh: "約拿書", en: "Jonah", ch: 4 },
    { id: "mic", zh: "彌迦書", en: "Micah", ch: 7 },
    { id: "nah", zh: "那鴻書", en: "Nahum", ch: 3 },
    { id: "hab", zh: "哈巴谷書", en: "Habakkuk", ch: 3 },
    { id: "zep", zh: "西番雅書", en: "Zephaniah", ch: 3 },
    { id: "hag", zh: "哈該書", en: "Haggai", ch: 2 },
    { id: "zec", zh: "撒迦利亞書", en: "Zechariah", ch: 14 },
    { id: "mal", zh: "瑪拉基書", en: "Malachi", ch: 4 },
  ]},
  { group: "福音書 Gospels", testament: "NT", books: [
    { id: "mat", zh: "馬太福音", en: "Matthew", ch: 28 },
    { id: "mrk", zh: "馬可福音", en: "Mark", ch: 16 },
    { id: "luk", zh: "路加福音", en: "Luke", ch: 24 },
    { id: "jhn", zh: "約翰福音", en: "John", ch: 21 },
  ]},
  { group: "教會歷史 Acts", testament: "NT", books: [
    { id: "act", zh: "使徒行傳", en: "Acts", ch: 28 },
  ]},
  { group: "保羅書信 Pauline Epistles", testament: "NT", books: [
    { id: "rom", zh: "羅馬書", en: "Romans", ch: 16 },
    { id: "1co", zh: "哥林多前書", en: "1 Corinthians", ch: 16 },
    { id: "2co", zh: "哥林多後書", en: "2 Corinthians", ch: 13 },
    { id: "gal", zh: "加拉太書", en: "Galatians", ch: 6 },
    { id: "eph", zh: "以弗所書", en: "Ephesians", ch: 6 },
    { id: "php", zh: "腓立比書", en: "Philippians", ch: 4 },
    { id: "col", zh: "歌羅西書", en: "Colossians", ch: 4 },
    { id: "1th", zh: "帖撒羅尼迦前書", en: "1 Thessalonians", ch: 5 },
    { id: "2th", zh: "帖撒羅尼迦後書", en: "2 Thessalonians", ch: 3 },
    { id: "1ti", zh: "提摩太前書", en: "1 Timothy", ch: 6 },
    { id: "2ti", zh: "提摩太後書", en: "2 Timothy", ch: 4 },
    { id: "tit", zh: "提多書", en: "Titus", ch: 3 },
    { id: "phm", zh: "腓利門書", en: "Philemon", ch: 1 },
  ]},
  { group: "一般書信 General Epistles", testament: "NT", books: [
    { id: "heb", zh: "希伯來書", en: "Hebrews", ch: 13 },
    { id: "jas", zh: "雅各書", en: "James", ch: 5 },
    { id: "1pe", zh: "彼得前書", en: "1 Peter", ch: 5 },
    { id: "2pe", zh: "彼得後書", en: "2 Peter", ch: 3 },
    { id: "1jn", zh: "約翰一書", en: "1 John", ch: 5 },
    { id: "2jn", zh: "約翰二書", en: "2 John", ch: 1 },
    { id: "3jn", zh: "約翰三書", en: "3 John", ch: 1 },
    { id: "jud", zh: "猶大書", en: "Jude", ch: 1 },
  ]},
  { group: "啟示文學 Apocalyptic", testament: "NT", books: [
    { id: "rev", zh: "啟示錄", en: "Revelation", ch: 22 },
  ]},
];

const ALL_BOOKS = BIBLE_BOOKS.flatMap(g => g.books);
const BOOK_MAP = Object.fromEntries(ALL_BOOKS.map(b => [b.id, b]));
const BOOK_ORDER = Object.fromEntries(ALL_BOOKS.map((b, i) => [b.id, i]));

// Verse counts per chapter for all 66 books
const V = {
gen:[31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
exo:[22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
lev:[17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
num:[54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
deu:[46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
jos:[18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
jdg:[36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
rut:[22,23,18,22],
"1sa":[28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,43,15,23,28,23,44,25,12,25,11,31,13],
"2sa":[27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
"1ki":[53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
"2ki":[18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
"1ch":[54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
"2ch":[17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
ezr:[11,70,13,24,17,22,28,36,15,44],
neh:[11,20,32,23,19,19,73,18,38,39,36,47,31],
est:[22,23,15,17,14,14,10,17,32,3],
job:[22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,35,27,25,33],
psa:[6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
pro:[33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
ecc:[18,26,22,16,20,12,29,17,18,20,10,14],
sng:[17,17,11,16,16,13,13,14],
isa:[31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
jer:[19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
lam:[22,22,66,22,22],
ezk:[28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
dan:[21,49,30,37,31,28,28,27,27,21,45,13],
hos:[11,23,5,19,15,11,16,14,17,15,12,14,16,9],
jol:[20,32,21],
amo:[15,16,15,13,27,14,17,14,15],
oba:[21],
jon:[17,10,10,11],
mic:[16,13,12,13,15,16,20],
nah:[15,14,19],
hab:[17,20,19],
zep:[18,15,20],
hag:[15,23],
zec:[21,13,10,14,11,15,14,23,17,12,17,14,9,21],
mal:[14,18,6,24],
mat:[25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
mrk:[45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
luk:[80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
jhn:[51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
act:[26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
rom:[32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
"1co":[31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
"2co":[24,17,18,18,21,18,16,24,15,18,33,21,14],
gal:[24,21,29,31,26,18],
eph:[23,22,21,32,33,24],
php:[30,30,21,23],
col:[29,23,25,18],
"1th":[10,20,13,18,28],
"2th":[12,17,18],
"1ti":[20,15,16,16,25,21],
"2ti":[18,26,17,22],
tit:[16,15,15],
phm:[25],
heb:[14,18,19,16,14,20,28,13,28,39,40,29,25],
jas:[27,26,18,17,20],
"1pe":[25,25,22,19,14],
"2pe":[21,22,18],
"1jn":[10,29,24,21,21],
"2jn":[13],
"3jn":[15],
jud:[25],
rev:[20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21],
};

function getVerseCount(bookId, chapter) {
  const arr = V[bookId];
  if (!arr || !chapter) return 0;
  return arr[parseInt(chapter) - 1] || 0;
}

const DEFAULT_BT_TAGS = [
  { id: "bt-covenant", name: "約 Covenant", color: "#BA7517" },
  { id: "bt-kingdom", name: "國度 Kingdom", color: "#639922" },
  { id: "bt-temple", name: "聖殿 Temple", color: "#854F0B" },
  { id: "bt-creation", name: "創造與新創造 Creation", color: "#1D9E75" },
  { id: "bt-exile", name: "流放與歸回 Exile", color: "#D85A30" },
  { id: "bt-law", name: "律法 Law", color: "#993556" },
  { id: "bt-sacrifice", name: "獻祭 Sacrifice", color: "#A32D2D" },
  { id: "bt-promise", name: "應許 Promise", color: "#534AB7" },
  { id: "bt-people", name: "子民 People of God", color: "#0F6E56" },
  { id: "bt-messiah", name: "彌賽亞 Messiah", color: "#185FA5" },
];

const DEFAULT_ST_TAGS = [
  { id: "st-theology", name: "神論 Theology Proper", color: "#378ADD" },
  { id: "st-christology", name: "基督論 Christology", color: "#185FA5" },
  { id: "st-pneumatology", name: "聖靈論 Pneumatology", color: "#85B7EB" },
  { id: "st-anthropology", name: "人論 Anthropology", color: "#5DCAA5" },
  { id: "st-hamartiology", name: "罪論 Hamartiology", color: "#E24B4A" },
  { id: "st-soteriology", name: "救恩論 Soteriology", color: "#D85A30" },
  { id: "st-ecclesiology", name: "教會論 Ecclesiology", color: "#7F77DD" },
  { id: "st-eschatology", name: "末世論 Eschatology", color: "#D4537E" },
  { id: "st-bibliology", name: "聖經論 Bibliology", color: "#BA7517" },
  { id: "st-atonement", name: "贖罪 Atonement", color: "#993C1D" },
];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function parseMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;margin:12px 0 4px;color:var(--text)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:600;margin:14px 0 4px;color:var(--text)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:19px;font-weight:700;margin:16px 0 6px;color:var(--text)">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:var(--surface2);padding:1px 5px;border-radius:3px;font-size:13px">$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);padding-left:12px;margin:8px 0;color:var(--muted);font-style:italic">$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:16px;list-style:decimal">$2</li>')
    .replace(/\n{2,}/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
  return html;
}

function getBookRef(bookId, chStart, chEnd, vStart, vEnd) {
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

const STORAGE_KEY = "bible-theology-app";

async function loadData() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}

async function saveData(data) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { console.error("Save failed:", e); }
}

const INIT_DATA = {
  notes: [],
  btTags: DEFAULT_BT_TAGS,
  stTags: DEFAULT_ST_TAGS,
  doctrineLinks: [],
  resources: [],
  resourceLinks: [],
  crossRefs: [],
  themeChains: [],
};

const RESOURCE_TYPES = [
  { id: "url", label: "網頁連結 URL" },
  { id: "book", label: "書籍/論文 Book" },
  { id: "video", label: "影音 Video/Podcast" },
];

// ─── Icon Components ───
const Icons = {
  Home: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  FileText: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Edit: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  Back: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Tag: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Link: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  Globe: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Book: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  Chain: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/><path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101"/></svg>,
  Layers: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Menu: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Moon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  Sun: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
};

// ─── Styles ───
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap');

  :root {
    --bg: #FAF8F4;
    --bg2: #F2EFE8;
    --surface: #FFFFFF;
    --surface2: #EDE9E0;
    --text: #2C2417;
    --muted: #8C7E6A;
    --accent: #9E7B4F;
    --accent2: #7B6340;
    --accent-light: #F5EDE0;
    --border: #E2DCD0;
    --border2: #D4CDB9;
    --bt-bg: #FFF8EE;
    --bt-border: #E8D5B0;
    --st-bg: #EEF4FF;
    --st-border: #B5CDEE;
    --danger: #C0392B;
    --success: #27AE60;
    --shadow: 0 1px 3px rgba(44,36,23,0.06);
    --shadow2: 0 4px 12px rgba(44,36,23,0.08);
    --radius: 10px;
    --radius-sm: 6px;
    --font-zh: 'Noto Serif TC', serif;
    --font-en: 'Source Serif 4', serif;
    --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .dark {
    --bg: #1A1814;
    --bg2: #242018;
    --surface: #2C2720;
    --surface2: #38332A;
    --text: #E8E0D4;
    --muted: #9C9080;
    --accent: #C89E6C;
    --accent2: #D4AE7C;
    --accent-light: #342E24;
    --border: #3E382E;
    --border2: #4A4438;
    --bt-bg: #332A1E;
    --bt-border: #5C4E38;
    --st-bg: #1E2634;
    --st-border: #344260;
    --danger: #E05A4E;
    --success: #4ECB7A;
    --shadow: 0 1px 3px rgba(0,0,0,0.2);
    --shadow2: 0 4px 12px rgba(0,0,0,0.3);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  .app-root {
    font-family: var(--font-body);
    color: var(--text);
    background: var(--bg);
    min-height: 100vh;
    display: flex;
    font-size: 14px;
    line-height: 1.6;
  }

  .sidebar {
    width: 220px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 20px 0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-brand {
    padding: 0 20px 20px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 12px;
  }

  .sidebar-brand h1 {
    font-family: var(--font-zh);
    font-size: 18px;
    font-weight: 700;
    color: var(--accent2);
    letter-spacing: 1px;
  }

  .sidebar-brand p {
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
    letter-spacing: 0.5px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    cursor: pointer;
    color: var(--muted);
    transition: all 0.15s;
    font-size: 13.5px;
    border-left: 3px solid transparent;
  }

  .nav-item:hover { background: var(--bg); color: var(--text); }
  .nav-item.active {
    color: var(--accent2);
    background: var(--accent-light);
    border-left-color: var(--accent);
    font-weight: 500;
  }

  .main {
    flex: 1;
    min-width: 0;
    padding: 24px 32px;
    max-width: 960px;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .page-title {
    font-family: var(--font-zh);
    font-size: 22px;
    font-weight: 700;
    color: var(--accent2);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    transition: all 0.15s;
  }

  .btn:hover { border-color: var(--border2); box-shadow: var(--shadow); }

  .btn-primary {
    background: var(--accent);
    color: #FFF;
    border-color: var(--accent);
  }

  .btn-primary:hover { background: var(--accent2); border-color: var(--accent2); }

  .btn-danger { color: var(--danger); border-color: #E8C0BC; }
  .btn-danger:hover { background: #FDF0EE; }

  .btn-sm { padding: 5px 10px; font-size: 12px; }
  .btn-ghost { border: none; background: none; padding: 6px; }
  .btn-ghost:hover { background: var(--bg2); }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
  }

  .card-title {
    font-family: var(--font-zh);
    font-size: 14px;
    font-weight: 600;
    color: var(--accent2);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .input, .textarea, .select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-family: inherit;
    color: var(--text);
    background: var(--surface);
    transition: border-color 0.15s;
    outline: none;
  }

  .select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg2);
  }

  .input:focus, .textarea:focus, .select:focus {
    border-color: var(--accent);
  }

  .textarea {
    min-height: 200px;
    resize: vertical;
    line-height: 1.7;
    font-family: var(--font-body);
  }

  .label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .field { margin-bottom: 16px; }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    border: 1.5px solid transparent;
    user-select: none;
  }

  .tag-pill.bt { background: var(--bt-bg); border-color: var(--bt-border); }
  .tag-pill.st { background: var(--st-bg); border-color: var(--st-border); }
  .tag-pill.selected { box-shadow: 0 0 0 2px var(--accent); }

  .tag-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    text-align: center;
  }

  .stat-number {
    font-family: var(--font-en);
    font-size: 28px;
    font-weight: 700;
    color: var(--accent2);
  }

  .stat-label {
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .progress-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .progress-cell {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    background: var(--surface2);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.1s;
  }

  .progress-cell.has-notes { background: var(--accent); border-color: var(--accent2); }
  .progress-cell:hover { transform: scale(1.3); }

  .group-label {
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
    width: 100%;
    margin-top: 8px;
    margin-bottom: 2px;
  }

  .note-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .note-card:hover { border-color: var(--accent); box-shadow: var(--shadow2); }

  .note-ref {
    font-family: var(--font-zh);
    font-size: 15px;
    font-weight: 600;
    color: var(--accent2);
  }

  .note-title {
    font-size: 14px;
    color: var(--text);
    margin-top: 2px;
  }

  .note-preview {
    font-size: 13px;
    color: var(--muted);
    margin-top: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .note-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .note-meta {
    font-size: 11px;
    color: var(--muted);
    margin-top: 8px;
  }

  .search-box {
    position: relative;
    margin-bottom: 16px;
  }

  .search-box svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
  }

  .search-box input {
    padding-left: 36px;
  }

  .empty {
    text-align: center;
    padding: 48px 20px;
    color: var(--muted);
  }

  .empty-icon {
    font-size: 40px;
    opacity: 0.3;
    margin-bottom: 12px;
  }

  .row { display: flex; gap: 12px; }
  .row > * { flex: 1; }

  .book-group-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent2);
    padding: 6px 12px 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .doctrine-link-card {
    background: var(--st-bg);
    border: 1px solid var(--st-border);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    margin-bottom: 8px;
  }

  .doctrine-link-tag {
    font-size: 12px;
    font-weight: 600;
    color: #185FA5;
  }

  .doctrine-link-note {
    font-size: 13px;
    color: var(--text);
    margin-top: 4px;
    font-style: italic;
  }

  .md-preview {
    line-height: 1.8;
    font-size: 14px;
  }

  .md-preview h1, .md-preview h2, .md-preview h3 {
    font-family: var(--font-zh);
  }

  .tag-section-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
    margin-top: 12px;
  }

  .tag-section-title:first-child { margin-top: 0; }

  .chart-bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .chart-bar-label {
    font-size: 11px;
    color: var(--muted);
    width: 120px;
    text-align: right;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chart-bar-track {
    flex: 1;
    height: 18px;
    background: var(--surface2);
    border-radius: 9px;
    overflow: hidden;
  }

  .chart-bar-fill {
    height: 100%;
    border-radius: 9px;
    transition: width 0.4s ease;
    min-width: 2px;
  }

  .chart-bar-count {
    font-size: 11px;
    color: var(--muted);
    width: 24px;
    flex-shrink: 0;
  }

  .tab-row {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }

  .tab {
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
  }

  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent2); border-bottom-color: var(--accent); font-weight: 500; }

  .mobile-header {
    display: none;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 12px 16px;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .mobile-header h1 {
    font-family: var(--font-zh);
    font-size: 16px;
    font-weight: 700;
    color: var(--accent2);
  }

  .overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 40;
  }

  @media (max-width: 700px) {
    .sidebar {
      position: fixed;
      left: -240px;
      z-index: 45;
      transition: left 0.25s;
      width: 240px;
    }
    .sidebar.open { left: 0; }
    .overlay.open { display: block; }
    .mobile-header { display: flex; }
    .main { padding: 16px; }
    .stat-grid { grid-template-columns: repeat(2, 1fr); }
    .row { flex-direction: column; }
  }

  .tooltip {
    position: absolute;
    background: var(--text);
    color: var(--bg);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 100;
    transform: translateX(-50%);
  }

  .chain-timeline { position: relative; padding-left: 24px; }
  .chain-timeline::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: var(--accent);
    border-radius: 1px;
    opacity: 0.4;
  }
  .chain-node {
    position: relative;
    padding: 10px 14px;
    margin-bottom: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    cursor: pointer;
    transition: all 0.15s;
  }
  .chain-node:hover { border-color: var(--accent); box-shadow: var(--shadow2); }
  .chain-node::before {
    content: '';
    position: absolute;
    left: -21px;
    top: 16px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--surface);
  }
  .chain-card-mini {
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .chain-card-mini:hover { border-color: var(--accent); }
`;

// ─── Tag Pill ───
function TagPill({ tag, type, selected, onClick, removable, onRemove }) {
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

// ─── Book Selector ───
function BookSelector({ value, onChange }) {
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

// ─── Tag Selector ───
function TagSelector({ btTags, stTags, selectedBt, selectedSt, onToggleBt, onToggleSt, onGoToTags }) {
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

// ─── Doctrine Link Editor ───
function DoctrineLinkEditor({ links, stTags, onChange }) {
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

// ─── Network Graph ───
function NetworkGraph({ data, onNavigate }) {
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

    // Chain sequential links
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

    // Cross-reference links
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

// ─── Dashboard ───
function Dashboard({ data, onNavigate }) {
  const { notes, btTags, stTags, doctrineLinks } = data;
  const totalBooks = new Set(notes.map(n => n.bookId)).size;

  const btCounts = useMemo(() => {
    const m = {};
    btTags.forEach(t => { m[t.id] = 0; });
    notes.forEach(n => (n.btTags || []).forEach(id => { m[id] = (m[id] || 0) + 1; }));
    return btTags.map(t => ({ ...t, count: m[t.id] || 0 })).sort((a, b) => b.count - a.count);
  }, [notes, btTags]);

  const stCounts = useMemo(() => {
    const m = {};
    stTags.forEach(t => { m[t.id] = 0; });
    (doctrineLinks || []).forEach(l => { m[l.doctrineId] = (m[l.doctrineId] || 0) + 1; });
    return stTags.map(t => ({ ...t, count: m[t.id] || 0 })).sort((a, b) => b.count - a.count);
  }, [doctrineLinks, stTags]);

  const [chartTab, setChartTab] = useState("bt");
  const chartData = chartTab === "bt" ? btCounts : stCounts;
  const maxCount = Math.max(1, ...chartData.map(d => d.count));

  const bookNoteMap = useMemo(() => {
    const m = {};
    notes.forEach(n => {
      if (!m[n.bookId]) m[n.bookId] = new Set();
      if (n.chapterStart) {
        const end = n.chapterEnd || n.chapterStart;
        for (let c = parseInt(n.chapterStart); c <= parseInt(end); c++) m[n.bookId].add(c);
      }
    });
    return m;
  }, [notes]);

  const recentNotes = useMemo(() =>
    [...notes].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)).slice(0, 6),
    [notes]
  );

  const [hovered, setHovered] = useState(null);
  const [expandedTag, setExpandedTag] = useState(null);
  const [expandedBook, setExpandedBook] = useState(null);

  const expandedBookNotes = useMemo(() => {
    if (!expandedBook) return {};
    const book = BOOK_MAP[expandedBook];
    if (!book) return {};
    const byChapter = {};
    notes.forEach(n => {
      if (n.bookId !== expandedBook) return;
      const chStart = parseInt(n.chapterStart) || 0;
      const chEnd = parseInt(n.chapterEnd || n.chapterStart) || chStart;
      for (let c = chStart; c <= chEnd; c++) {
        if (!byChapter[c]) byChapter[c] = [];
        byChapter[c].push(n);
      }
    });
    return byChapter;
  }, [expandedBook, notes]);

  const expandedNotes = useMemo(() => {
    if (!expandedTag) return [];
    if (chartTab === "bt") {
      return notes.filter(n => (n.btTags || []).includes(expandedTag))
        .sort((a, b) => BOOK_ORDER[a.bookId] - BOOK_ORDER[b.bookId]);
    } else {
      const linkedNoteIds = (doctrineLinks || []).filter(l => l.doctrineId === expandedTag).map(l => l.noteId);
      return notes.filter(n => linkedNoteIds.includes(n.id))
        .sort((a, b) => BOOK_ORDER[a.bookId] - BOOK_ORDER[b.bookId]);
    }
  }, [expandedTag, chartTab, notes, doctrineLinks]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Dashboard 總覽</h2>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{notes.length}</div>
          <div className="stat-label">筆記 Notes</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalBooks}</div>
          <div className="stat-label">涵蓋書卷 Books</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{(data.resources || []).length}</div>
          <div className="stat-label">外部資料 Resources</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{(data.themeChains || []).length}</div>
          <div className="stat-label">追蹤鏈 Chains</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">
            <Icons.Tag />
            主題分布 Topic distribution
          </div>
          <div className="tab-row">
            <div className={`tab ${chartTab === "bt" ? "active" : ""}`} onClick={() => { setChartTab("bt"); setExpandedTag(null); }}>聖經神學</div>
            <div className={`tab ${chartTab === "st" ? "active" : ""}`} onClick={() => { setChartTab("st"); setExpandedTag(null); }}>系統神學</div>
          </div>
          {chartData.filter(d => d.count > 0).length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>尚無資料</div>
          ) : (
            chartData.filter(d => d.count > 0).map(d => (
              <div key={d.id}>
                <div className="chart-bar-row" onClick={() => setExpandedTag(expandedTag === d.id ? null : d.id)} style={{ cursor: "pointer", borderRadius: "var(--radius-sm)", padding: "3px 0", background: expandedTag === d.id ? "var(--accent-light)" : "transparent", transition: "background 0.15s" }}>
                  <div className="chart-bar-label" style={{ fontWeight: expandedTag === d.id ? 600 : 400 }}>{d.name.split(" ")[0]}</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%`, background: d.color }} />
                  </div>
                  <div className="chart-bar-count">{d.count}</div>
                </div>
                {expandedTag === d.id && expandedNotes.length > 0 && (
                  <div style={{ marginLeft: 128, marginBottom: 8, paddingLeft: 8, borderLeft: `3px solid ${d.color}` }}>
                    {expandedNotes.map(n => (
                      <div key={n.id} onClick={() => onNavigate("view-note", { noteId: n.id })} style={{ padding: "5px 8px", fontSize: 13, cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ color: "var(--accent2)", fontWeight: 500 }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</span>
                        {n.title && <span style={{ color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <Icons.Book />
            研究進度 Study progress
          </div>
          <div style={{ maxHeight: expandedBook ? 400 : 280, overflowY: "auto", transition: "max-height 0.3s" }}>
            {BIBLE_BOOKS.map(g => (
              <div key={g.group}>
                <div className="group-label">{g.group}</div>
                <div className="progress-grid">
                  {g.books.map(b => {
                    const chapters = bookNoteMap[b.id];
                    const hasNotes = chapters && chapters.size > 0;
                    const ratio = hasNotes ? chapters.size / b.ch : 0;
                    const isExpanded = expandedBook === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`progress-cell ${hasNotes ? "has-notes" : ""}`}
                        style={{
                          ...(hasNotes ? { opacity: 0.4 + ratio * 0.6 } : {}),
                          ...(isExpanded ? { outline: "2px solid var(--accent)", outlineOffset: 1, zIndex: 1 } : {}),
                        }}
                        title={`${b.zh} ${b.en} — ${hasNotes ? `${chapters.size}/${b.ch} 章` : "尚無筆記"}`}
                        onClick={() => setExpandedBook(isExpanded ? null : b.id)}
                      />
                    );
                  })}
                </div>
                {g.books.some(b => expandedBook === b.id) && (() => {
                  const b = BOOK_MAP[expandedBook];
                  const chapters = bookNoteMap[expandedBook];
                  return (
                    <div style={{ margin: "8px 0 12px", padding: 12, background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)" }}>{b.zh} {b.en}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{chapters ? chapters.size : 0}/{b.ch} 章有筆記</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
                        {Array.from({ length: b.ch }, (_, i) => i + 1).map(ch => {
                          const hasNote = chapters && chapters.has(ch);
                          const chNotes = expandedBookNotes[ch] || [];
                          return (
                            <div key={ch} style={{
                              width: 22, height: 22, borderRadius: 3,
                              background: hasNote ? "var(--accent)" : "var(--surface2)",
                              border: `1px solid ${hasNote ? "var(--accent2)" : "var(--border)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, color: hasNote ? "#fff" : "var(--muted)",
                              cursor: hasNote ? "pointer" : "default",
                              fontWeight: hasNote ? 600 : 400,
                              opacity: hasNote ? 1 : 0.6,
                            }}
                              title={hasNote ? `第 ${ch} 章：${chNotes.length} 則筆記` : `第 ${ch} 章：尚無筆記`}
                            >{ch}</div>
                          );
                        })}
                      </div>
                      {Object.keys(expandedBookNotes).length > 0 && (
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, maxHeight: 160, overflowY: "auto" }}>
                          {Object.entries(expandedBookNotes)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([ch, chNotes]) => (
                              <div key={ch}>
                                {chNotes.map(n => (
                                  <div key={n.id} onClick={() => onNavigate("view-note", { noteId: n.id })} style={{ padding: "4px 8px", fontSize: 12, cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <span style={{ color: "var(--accent2)", fontWeight: 500 }}>
                                      {n.chapterStart}{n.verseStart ? `:${n.verseStart}` : ""}{n.chapterEnd && n.chapterEnd !== n.chapterStart ? `-${n.chapterEnd}${n.verseEnd ? `:${n.verseEnd}` : ""}` : n.verseEnd && n.verseEnd !== n.verseStart ? `-${n.verseEnd}` : ""}
                                    </span>
                                    {n.title && <span style={{ color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                                  </div>
                                ))}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {(data.themeChains || []).length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <Icons.Layers />
              主題追蹤鏈 Theme chains
            </div>
            <button className="btn btn-sm" onClick={() => onNavigate("chains")}>查看全部</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
            {(data.themeChains || []).map(chain => {
              const chainN = (chain.noteIds || []).map(id => notes.find(n => n.id === id)).filter(Boolean);
              const books = [...new Set(chainN.map(n => n.bookId))];
              const linkedTag = btTags.find(t => t.id === chain.btTagId);
              const firstBook = books.length > 0 ? BOOK_MAP[books[0]] : null;
              const lastBook = books.length > 0 ? BOOK_MAP[books[books.length - 1]] : null;
              return (
                <div key={chain.id} className="chain-card-mini" onClick={() => onNavigate("chains", { chainId: chain.id })}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)" }}>{chain.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                    {chainN.length} 則筆記 · {books.length} 卷書
                  </div>
                  {firstBook && lastBook && (
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>
                      {firstBook.zh} → {lastBook.zh}
                    </div>
                  )}
                  {linkedTag && <div style={{ marginTop: 4 }}><TagPill tag={linkedTag} type="bt" /></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <Icons.FileText />
          最近編輯 Recent notes
        </div>
        {recentNotes.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13, padding: "16px 0", textAlign: "center" }}>尚無筆記，點擊「新增筆記」開始研究</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {recentNotes.map(n => (
              <div key={n.id} className="note-card" onClick={() => onNavigate("view-note", { noteId: n.id })}>
                <div className="note-ref">{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</div>
                {n.title && <div className="note-title">{n.title}</div>}
                <div className="note-tags">
                  {(n.btTags || []).slice(0, 3).map(id => {
                    const tag = btTags.find(t => t.id === id);
                    return tag ? <TagPill key={id} tag={tag} type="bt" /> : null;
                  })}
                </div>
                <div className="note-meta">{new Date(n.updatedAt || n.createdAt).toLocaleDateString("zh-TW")}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">
          <Icons.Chain />
          關聯網絡圖 Network graph
        </div>
        <NetworkGraph data={data} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

// ─── Notes List ───
function NotesList({ data, onNavigate, initialFilter }) {
  const { notes, btTags, stTags } = data;
  const [search, setSearch] = useState("");
  const [filterBook, setFilterBook] = useState(initialFilter?.filterBook || "");
  const [filterTag, setFilterTag] = useState("");

  const filtered = useMemo(() => {
    let list = [...notes].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    if (filterBook) list = list.filter(n => n.bookId === filterBook);
    if (filterTag) list = list.filter(n => (n.btTags || []).includes(filterTag) || (n.stTags || []).includes(filterTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n => {
        const book = BOOK_MAP[n.bookId];
        const ref = book ? `${book.zh} ${book.en}` : "";
        return (n.title || "").toLowerCase().includes(q)
          || (n.content || "").toLowerCase().includes(q)
          || ref.toLowerCase().includes(q);
      });
    }
    return list;
  }, [notes, filterBook, filterTag, search]);

  const allTags = [...btTags.map(t => ({ ...t, type: "bt" })), ...stTags.map(t => ({ ...t, type: "st" }))];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">筆記 Notes</h2>
        <button className="btn btn-primary" onClick={() => onNavigate("new-note")}>
          <Icons.Plus /> 新增筆記
        </button>
      </div>

      <div className="search-box">
        <Icons.Search />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋筆記..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="select" style={{ width: "auto", minWidth: 160 }} value={filterBook} onChange={e => setFilterBook(e.target.value)}>
          <option value="">所有書卷</option>
          {BIBLE_BOOKS.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.books.map(b => <option key={b.id} value={b.id}>{b.zh} {b.en}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="select" style={{ width: "auto", minWidth: 160 }} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="">所有標籤</option>
          <optgroup label="聖經神學 Biblical">
            {btTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </optgroup>
          <optgroup label="系統神學 Systematic">
            {stTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </optgroup>
        </select>
        {(filterBook || filterTag) && (
          <button className="btn btn-sm btn-ghost" onClick={() => { setFilterBook(""); setFilterTag(""); }}>
            <Icons.X /> 清除篩選
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><Icons.FileText /></div>
          <div>{notes.length === 0 ? "尚無筆記" : "沒有符合條件的筆記"}</div>
          {notes.length === 0 && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onNavigate("new-note")}><Icons.Plus /> 新增第一則筆記</button>}
        </div>
      ) : (
        filtered.map(n => (
          <div key={n.id} className="note-card" onClick={() => onNavigate("view-note", { noteId: n.id })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="note-ref">{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</div>
                {n.title && <div className="note-title">{n.title}</div>}
              </div>
              <div className="note-meta">{new Date(n.updatedAt || n.createdAt).toLocaleDateString("zh-TW")}</div>
            </div>
            <div className="note-preview">{(n.content || "").replace(/[#*>`-]/g, "").slice(0, 120)}</div>
            <div className="note-tags">
              {(n.btTags || []).map(id => {
                const tag = btTags.find(t => t.id === id);
                return tag ? <TagPill key={id} tag={tag} type="bt" /> : null;
              })}
              {(n.stTags || []).map(id => {
                const tag = stTags.find(t => t.id === id);
                return tag ? <TagPill key={id} tag={tag} type="st" /> : null;
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Note Editor ───
function NoteEditor({ data, noteId, onSave, onCancel, onNavigate }) {
  const existing = noteId ? data.notes.find(n => n.id === noteId) : null;
  const [bookId, setBookId] = useState(existing?.bookId || "");
  const [chapterStart, setChapterStart] = useState(existing?.chapterStart || "");
  const [chapterEnd, setChapterEnd] = useState(existing?.chapterEnd || "");
  const [verseStart, setVerseStart] = useState(existing?.verseStart || "");
  const [verseEnd, setVerseEnd] = useState(existing?.verseEnd || "");
  const [title, setTitle] = useState(existing?.title || "");
  const [content, setContent] = useState(existing?.content || "");
  const [selBt, setSelBt] = useState(existing?.btTags || []);
  const [selSt, setSelSt] = useState(existing?.stTags || []);
  const [docLinks, setDocLinks] = useState(
    noteId ? (data.doctrineLinks || []).filter(l => l.noteId === noteId).map(l => ({ doctrineId: l.doctrineId, annotation: l.annotation })) : []
  );
  const [preview, setPreview] = useState(false);

  const book = BOOK_MAP[bookId];
  const maxCh = book ? book.ch : 0;
  const chapterOptions = Array.from({ length: maxCh }, (_, i) => i + 1);
  const verseStartMax = getVerseCount(bookId, chapterStart);
  const verseEndChapter = chapterEnd || chapterStart;
  const verseEndMax = getVerseCount(bookId, verseEndChapter);

  const toggleBt = id => setSelBt(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSt = id => setSelSt(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = () => {
    if (!bookId) return alert("請選擇書卷");
    if (!content.trim()) return alert("請輸入筆記內容");
    const note = {
      id: existing?.id || uid(),
      bookId, chapterStart, chapterEnd, verseStart, verseEnd,
      title: title.trim(),
      content,
      btTags: selBt,
      stTags: selSt,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSave(note, docLinks);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" onClick={onCancel}><Icons.Back /></button>
          <h2 className="page-title">{existing ? "編輯筆記" : "新增筆記"}</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setPreview(!preview)}>{preview ? "編輯" : "預覽"}</button>
          <button className="btn btn-primary" onClick={handleSave}>儲存</button>
        </div>
      </div>

      {preview ? (
        <div className="card">
          <div className="note-ref" style={{ fontSize: 18, marginBottom: 4 }}>
            {getBookRef(bookId, chapterStart, chapterEnd, verseStart, verseEnd)}
          </div>
          {title && <h3 style={{ fontFamily: "var(--font-zh)", fontSize: 16, marginBottom: 12 }}>{title}</h3>}
          <div className="note-tags" style={{ marginBottom: 16 }}>
            {selBt.map(id => { const t = data.btTags.find(x => x.id === id); return t ? <TagPill key={id} tag={t} type="bt" /> : null; })}
            {selSt.map(id => { const t = data.stTags.find(x => x.id === id); return t ? <TagPill key={id} tag={t} type="st" /> : null; })}
          </div>
          <div className="md-preview" dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
          {docLinks.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div className="label">系統神學教義連結</div>
              {docLinks.map((l, i) => {
                const doc = data.stTags.find(t => t.id === l.doctrineId);
                return (
                  <div key={i} className="doctrine-link-card">
                    <div className="doctrine-link-tag">{doc ? doc.name : l.doctrineId}</div>
                    <div className="doctrine-link-note">{l.annotation}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><Icons.Book /> 經文範圍</div>
            <div className="field">
              <label className="label">書卷</label>
              <BookSelector value={bookId} onChange={v => { setBookId(v); setChapterStart(""); setChapterEnd(""); setVerseStart(""); setVerseEnd(""); }} />
            </div>
            <div className="row">
              <div className="field">
                <label className="label">起始章</label>
                <select className="select" value={chapterStart} onChange={e => { setChapterStart(e.target.value); setVerseStart(""); if (!chapterEnd) { setVerseEnd(""); } }} disabled={!bookId}>
                  <option value="">選擇章...</option>
                  {chapterOptions.map(c => <option key={c} value={String(c)}>第 {c} 章</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">起始節</label>
                <select className="select" value={verseStart} onChange={e => setVerseStart(e.target.value)} disabled={!chapterStart}>
                  <option value="">全章</option>
                  {Array.from({ length: verseStartMax }, (_, i) => i + 1).map(v => <option key={v} value={String(v)}>第 {v} 節</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">結束章</label>
                <select className="select" value={chapterEnd} onChange={e => { setChapterEnd(e.target.value); setVerseEnd(""); }} disabled={!chapterStart}>
                  <option value="">同起始章</option>
                  {chapterOptions.filter(c => c >= parseInt(chapterStart || "1")).map(c => <option key={c} value={String(c)}>第 {c} 章</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">結束節</label>
                <select className="select" value={verseEnd} onChange={e => setVerseEnd(e.target.value)} disabled={!chapterStart}>
                  <option value="">{verseStart && !chapterEnd ? "同起始節" : "章末"}</option>
                  {Array.from({ length: verseEndMax }, (_, i) => i + 1)
                    .filter(v => {
                      const sameChapter = !chapterEnd || chapterEnd === chapterStart;
                      return !(sameChapter && verseStart && v < parseInt(verseStart));
                    })
                    .map(v => <option key={v} value={String(v)}>第 {v} 節</option>)}
                </select>
              </div>
            </div>
            {bookId && chapterStart && (
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, fontStyle: "italic" }}>
                {getBookRef(bookId, chapterStart, chapterEnd, verseStart, verseEnd)}
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title" style={{ margin: 0 }}><Icons.FileText /> 筆記內容</div>
              {!noteId && (
                <select className="select" style={{ width: "auto", minWidth: 140, fontSize: 12 }} onChange={e => {
                  const tpl = NOTE_TEMPLATES.find(t => t.id === e.target.value);
                  if (tpl && tpl.content) {
                    if (!content.trim() || confirm("套用範本將覆蓋目前內容，確定？")) {
                      setContent(tpl.content);
                    }
                  }
                  e.target.value = "";
                }} defaultValue="">
                  <option value="" disabled>套用範本...</option>
                  {NOTE_TEMPLATES.filter(t => t.id !== "blank").map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="label">標題（可選）</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="例：逾越節羔羊的神學意涵" />
            </div>
            <div className="field">
              <label className="label">內容（支援 Markdown）</label>
              <textarea className="textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="在此撰寫你的筆記...&#10;&#10;支援 Markdown 格式：&#10;# 標題&#10;**粗體** *斜體*&#10;- 列表&#10;> 引用&#10;&#10;或選擇右上角的範本開始" />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><Icons.Tag /> 主題標籤</div>
            <TagSelector
              btTags={data.btTags}
              stTags={data.stTags}
              selectedBt={selBt}
              selectedSt={selSt}
              onToggleBt={toggleBt}
              onToggleSt={toggleSt}
              onGoToTags={onNavigate ? () => onNavigate("tags") : undefined}
            />
          </div>

          <div className="card">
            <div className="card-title"><Icons.Link /> 系統神學教義連結</div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
              記錄此經文筆記如何貢獻於某個系統神學教義的理解
            </p>
            <DoctrineLinkEditor links={docLinks} stTags={data.stTags} onChange={setDocLinks} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Cross-Reference Annotation ───
function CrossRefAnnotation({ targetNote, onConfirm, onCancel }) {
  const [annotation, setAnnotation] = useState("");
  if (!targetNote) return null;
  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        引用目標：<span style={{ fontWeight: 600, color: "var(--accent2)" }}>
          {getBookRef(targetNote.bookId, targetNote.chapterStart, targetNote.chapterEnd, targetNote.verseStart, targetNote.verseEnd)}
          {targetNote.title ? ` — ${targetNote.title}` : ""}
        </span>
      </div>
      <div className="field">
        <label className="label">引用說明（可選）</label>
        <input className="input" value={annotation} onChange={e => setAnnotation(e.target.value)}
          placeholder="例：此處的羔羊意象與出埃及記 12 章互相呼應"
          onKeyDown={e => e.key === "Enter" && onConfirm(annotation)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onConfirm(annotation)}>建立引用</button>
        <button className="btn btn-sm" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

// ─── Note View ───
function NoteView({ data, noteId, onNavigate, onDelete, onUpdate }) {
  const note = data.notes.find(n => n.id === noteId);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [resSearch, setResSearch] = useState("");

  if (!note) return <div className="empty">找不到此筆記</div>;

  const docLinks = (data.doctrineLinks || []).filter(l => l.noteId === noteId);
  const linkedResources = useMemo(() => {
    const resIds = (data.resourceLinks || []).filter(l => l.noteId === noteId).map(l => l.resourceId);
    return (data.resources || []).filter(r => resIds.includes(r.id));
  }, [data.resourceLinks, data.resources, noteId]);

  const unlinkedResources = useMemo(() => {
    const linkedIds = (data.resourceLinks || []).filter(l => l.noteId === noteId).map(l => l.resourceId);
    let list = (data.resources || []).filter(r => !linkedIds.includes(r.id));
    if (resSearch.trim()) {
      const q = resSearch.toLowerCase();
      list = list.filter(r => (r.title || "").toLowerCase().includes(q) || (r.author || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q));
    }
    return list;
  }, [data.resources, data.resourceLinks, noteId, resSearch]);

  const linkResource = (resourceId) => {
    onUpdate({ ...data, resourceLinks: [...(data.resourceLinks || []), { noteId, resourceId }] });
  };

  const unlinkResource = (resourceId) => {
    onUpdate({ ...data, resourceLinks: (data.resourceLinks || []).filter(l => !(l.noteId === noteId && l.resourceId === resourceId)) });
  };

  const [showCrossRefPicker, setShowCrossRefPicker] = useState(false);
  const [crossRefSearch, setCrossRefSearch] = useState("");
  const [crossRefNote, setCrossRefNote] = useState("");

  const crossRefs = useMemo(() => {
    const refs = (data.crossRefs || []).filter(r => r.fromId === noteId || r.toId === noteId);
    return refs.map(r => {
      const otherId = r.fromId === noteId ? r.toId : r.fromId;
      const otherNote = data.notes.find(n => n.id === otherId);
      const direction = r.fromId === noteId ? "out" : "in";
      return otherNote ? { ...r, otherNote, direction } : null;
    }).filter(Boolean).sort((a, b) => BOOK_ORDER[a.otherNote.bookId] - BOOK_ORDER[b.otherNote.bookId]);
  }, [data.crossRefs, data.notes, noteId]);

  const availableCrossRefNotes = useMemo(() => {
    const linkedIds = new Set(crossRefs.map(r => r.otherNote.id));
    linkedIds.add(noteId);
    let list = data.notes.filter(n => !linkedIds.has(n.id));
    if (crossRefSearch.trim()) {
      const q = crossRefSearch.toLowerCase();
      list = list.filter(n => {
        const book = BOOK_MAP[n.bookId];
        const ref = book ? `${book.zh} ${book.en}` : "";
        return ref.toLowerCase().includes(q) || (n.title || "").toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => BOOK_ORDER[a.bookId] - BOOK_ORDER[b.bookId]);
  }, [data.notes, crossRefs, noteId, crossRefSearch]);

  const addCrossRef = (toNoteId, annotation) => {
    const newRef = { id: uid(), fromId: noteId, toId: toNoteId, annotation: annotation || "", createdAt: Date.now() };
    onUpdate({ ...data, crossRefs: [...(data.crossRefs || []), newRef] });
    setShowCrossRefPicker(false);
    setCrossRefNote("");
    setCrossRefSearch("");
  };

  const removeCrossRef = (refId) => {
    onUpdate({ ...data, crossRefs: (data.crossRefs || []).filter(r => r.id !== refId) });
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" onClick={() => onNavigate("notes")}><Icons.Back /></button>
          <h2 className="page-title">筆記詳情</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => onNavigate("edit-note", { noteId: note.id })}>
            <Icons.Edit /> 編輯
          </button>
          <button className="btn btn-danger" onClick={() => { if (confirm("確定刪除此筆記？")) onDelete(note.id); }}>
            <Icons.Trash /> 刪除
          </button>
        </div>
      </div>

      <div className="card">
        <div className="note-ref" style={{ fontSize: 20, marginBottom: 4 }}>
          {getBookRef(note.bookId, note.chapterStart, note.chapterEnd, note.verseStart, note.verseEnd)}
        </div>
        {note.title && <h3 style={{ fontFamily: "var(--font-zh)", fontSize: 17, marginBottom: 12, color: "var(--text)" }}>{note.title}</h3>}

        <div className="note-tags" style={{ marginBottom: 16 }}>
          {(note.btTags || []).map(id => {
            const tag = data.btTags.find(t => t.id === id);
            return tag ? <TagPill key={id} tag={tag} type="bt" /> : null;
          })}
          {(note.stTags || []).map(id => {
            const tag = data.stTags.find(t => t.id === id);
            return tag ? <TagPill key={id} tag={tag} type="st" /> : null;
          })}
        </div>

        <div className="md-preview" dangerouslySetInnerHTML={{ __html: parseMarkdown(note.content) }} />

        <div className="note-meta" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          建立：{new Date(note.createdAt).toLocaleString("zh-TW")}
          {note.updatedAt && note.updatedAt !== note.createdAt && (
            <span> ｜ 更新：{new Date(note.updatedAt).toLocaleString("zh-TW")}</span>
          )}
        </div>
      </div>

      {docLinks.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title"><Icons.Link /> 系統神學教義連結</div>
          {docLinks.map((l, i) => {
            const doc = data.stTags.find(t => t.id === l.doctrineId);
            return (
              <div key={i} className="doctrine-link-card">
                <div className="doctrine-link-tag">{doc ? doc.name : l.doctrineId}</div>
                <div className="doctrine-link-note">{l.annotation}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}><Icons.Globe /> 外部資料 ({linkedResources.length})</div>
          <button className="btn btn-sm" onClick={() => { setShowLinkPicker(!showLinkPicker); setResSearch(""); }}>
            {showLinkPicker ? "收合" : <><Icons.Plus /> 連結資料</>}
          </button>
        </div>

        {linkedResources.length === 0 && !showLinkPicker && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
            尚無連結的外部資料
          </div>
        )}

        {linkedResources.map(r => {
          const typeInfo = RESOURCE_TYPES.find(t => t.id === r.type);
          return (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 12px", marginBottom: 6, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 8, background: r.type === "url" ? "var(--bt-bg)" : r.type === "book" ? "var(--st-bg)" : "#F3EAF9", border: `1px solid ${r.type === "url" ? "var(--bt-border)" : r.type === "book" ? "var(--st-border)" : "#D8C0E8"}`, fontWeight: 500, flexShrink: 0 }}>
                    {typeInfo?.label.split(" ")[0]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)" }}>{r.title}</span>
                </div>
                {r.author && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{r.author}{r.publication ? ` — ${r.publication}` : ""}{r.pages ? ` (${r.pages})` : ""}</div>}
                {r.url && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2, wordBreak: "break-all", cursor: "pointer" }} onClick={() => window.open && window.open(r.url)}>{r.url}</div>}
                {r.summary && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>{r.summary}</div>}
              </div>
              <button className="btn-ghost" onClick={() => unlinkResource(r.id)} title="解除連結" style={{ color: "var(--danger)", flexShrink: 0, marginLeft: 8 }}><Icons.X /></button>
            </div>
          );
        })}

        {showLinkPicker && (
          <div style={{ marginTop: 10, background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div className="search-box" style={{ flex: 1, marginBottom: 0 }}>
                <Icons.Search />
                <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋外部資料..." value={resSearch} onChange={e => setResSearch(e.target.value)} />
              </div>
              <button className="btn btn-sm" onClick={() => onNavigate("resources")} title="前往管理外部資料">
                <Icons.Globe /> 管理資料庫
              </button>
            </div>
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {unlinkedResources.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 16 }}>
                  {(data.resources || []).length === 0 ? "尚無外部資料，請先前往「外部資料」頁面新增" : "所有資料都已連結，或沒有符合搜尋的結果"}
                </div>
              ) : (
                unlinkedResources.map(r => {
                  const typeInfo = RESOURCE_TYPES.find(t => t.id === r.type);
                  return (
                    <div key={r.id} onClick={() => linkResource(r.id)} style={{ padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 2, transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: r.type === "url" ? "var(--bt-bg)" : r.type === "book" ? "var(--st-bg)" : "#F3EAF9", fontWeight: 500 }}>
                          {typeInfo?.label.split(" ")[0]}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</span>
                      </div>
                      {r.author && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{r.author}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}><Icons.FileText /> 交叉引用 Cross-references ({crossRefs.length})</div>
          <button className="btn btn-sm" onClick={() => { setShowCrossRefPicker(!showCrossRefPicker); setCrossRefSearch(""); setCrossRefNote(""); }}>
            {showCrossRefPicker ? "收合" : <><Icons.Plus /> 引用筆記</>}
          </button>
        </div>

        {crossRefs.length === 0 && !showCrossRefPicker && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
            尚無交叉引用
          </div>
        )}

        {crossRefs.map(ref => (
          <div key={ref.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 12px", marginBottom: 6, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onNavigate("view-note", { noteId: ref.otherNote.id })}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 8, background: ref.direction === "out" ? "var(--bt-bg)" : "var(--st-bg)", border: `1px solid ${ref.direction === "out" ? "var(--bt-border)" : "var(--st-border)"}`, fontWeight: 500 }}>
                  {ref.direction === "out" ? "→ 引用" : "← 被引用"}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent2)" }}>
                  {getBookRef(ref.otherNote.bookId, ref.otherNote.chapterStart, ref.otherNote.chapterEnd, ref.otherNote.verseStart, ref.otherNote.verseEnd)}
                </span>
              </div>
              {ref.otherNote.title && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{ref.otherNote.title}</div>}
              {ref.annotation && <div style={{ fontSize: 12, color: "var(--text)", marginTop: 4, fontStyle: "italic" }}>{ref.annotation}</div>}
            </div>
            <button className="btn-ghost" onClick={() => removeCrossRef(ref.id)} title="移除引用" style={{ color: "var(--danger)", flexShrink: 0, marginLeft: 8 }}><Icons.X /></button>
          </div>
        ))}

        {showCrossRefPicker && (
          <div style={{ marginTop: 8, background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            {!crossRefNote ? (
              <>
                <div className="search-box" style={{ marginBottom: 8 }}>
                  <Icons.Search />
                  <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋筆記..." value={crossRefSearch} onChange={e => setCrossRefSearch(e.target.value)} />
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {availableCrossRefNotes.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 12 }}>沒有可引用的筆記</div>
                  ) : (
                    availableCrossRefNotes.slice(0, 30).map(n => (
                      <div key={n.id} onClick={() => setCrossRefNote(n.id)} style={{ padding: "6px 8px", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 2, transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent2)" }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</span>
                        {n.title && <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <CrossRefAnnotation
                targetNote={data.notes.find(n => n.id === crossRefNote)}
                onConfirm={(annotation) => addCrossRef(crossRefNote, annotation)}
                onCancel={() => setCrossRefNote("")}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// ─── Doctrine Page ───
function DoctrinePage({ data, onNavigate }) {
  const { notes, stTags, doctrineLinks } = data;
  const [selected, setSelected] = useState(null);

  const docCounts = useMemo(() => {
    const m = {};
    (doctrineLinks || []).forEach(l => { m[l.doctrineId] = (m[l.doctrineId] || 0) + 1; });
    return m;
  }, [doctrineLinks]);

  const linkedNotes = useMemo(() => {
    if (!selected) return [];
    const links = (doctrineLinks || []).filter(l => l.doctrineId === selected);
    return links.map(l => {
      const note = notes.find(n => n.id === l.noteId);
      return note ? { ...l, note } : null;
    }).filter(Boolean).sort((a, b) => {
      const oa = BOOK_ORDER[a.note.bookId] ?? 999;
      const ob = BOOK_ORDER[b.note.bookId] ?? 999;
      if (oa !== ob) return oa - ob;
      return (parseInt(a.note.chapterStart) || 0) - (parseInt(b.note.chapterStart) || 0);
    });
  }, [selected, doctrineLinks, notes]);

  const selectedTag = stTags.find(t => t.id === selected);
  const linkedBooks = useMemo(() => [...new Set(linkedNotes.map(l => l.note.bookId))], [linkedNotes]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">系統神學教義 Doctrines</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
        <div>
          {stTags.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                marginBottom: 4,
                background: selected === t.id ? "var(--st-bg)" : "transparent",
                border: selected === t.id ? "1px solid var(--st-border)" : "1px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="tag-dot" style={{ background: t.color }} />
                <span style={{ fontSize: 13, fontWeight: selected === t.id ? 600 : 400 }}>{t.name.split(" ")[0]}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{docCounts[t.id] || 0} 則連結</div>
            </div>
          ))}
        </div>

        <div>
          {!selected ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              選擇左側教義以檢視相關經文筆記
            </div>
          ) : linkedNotes.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              尚無筆記連結到此教義
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontFamily: "var(--font-zh)", fontSize: 17, fontWeight: 700, color: "var(--accent2)", marginBottom: 4 }}>
                  {selectedTag?.name}
                </h3>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)" }}>
                  <span>{linkedNotes.length} 則經文筆記</span>
                  <span>{linkedBooks.length} 卷書</span>
                  {linkedBooks.length > 0 && (
                    <span>{BOOK_MAP[linkedBooks[0]]?.zh} → {BOOK_MAP[linkedBooks[linkedBooks.length - 1]]?.zh}</span>
                  )}
                </div>
              </div>

              <div className="chain-timeline">
                {linkedNotes.map((item, i) => {
                  const prevBookId = i > 0 ? linkedNotes[i - 1].note.bookId : null;
                  const showBookHeader = item.note.bookId !== prevBookId;
                  const book = BOOK_MAP[item.note.bookId];
                  const group = BIBLE_BOOKS.find(g => g.books.some(b => b.id === item.note.bookId));
                  return (
                    <div key={item.noteId + "-" + i}>
                      {showBookHeader && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4, marginTop: i > 0 ? 14 : 0, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{book?.zh} {book?.en}</span>
                          {group && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted)" }}>{group.group.split(" ")[0]}</span>}
                        </div>
                      )}
                      <div className="chain-node" onClick={() => onNavigate("view-note", { noteId: item.note.id })}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>
                          {item.note.chapterStart && `${item.note.chapterStart}${item.note.verseStart ? `:${item.note.verseStart}` : ""}`}
                          {item.note.chapterEnd && item.note.chapterEnd !== item.note.chapterStart && `-${item.note.chapterEnd}${item.note.verseEnd ? `:${item.note.verseEnd}` : ""}`}
                          {!item.note.chapterEnd && item.note.verseEnd && item.note.verseEnd !== item.note.verseStart && `-${item.note.verseEnd}`}
                        </div>
                        {item.note.title && <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{item.note.title}</div>}
                        <div className="doctrine-link-note" style={{ marginTop: 4, fontSize: 12 }}>
                          {item.annotation}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Theme Chain Page ───
function ThemeChainPage({ data, onUpdate, onNavigate, initialChainId }) {
  const { themeChains = [], notes, btTags } = data;
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", btTagId: "" });
  const [addingNote, setAddingNote] = useState(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [selected, setSelected] = useState(initialChainId || null);

  const resetForm = () => setForm({ name: "", description: "", btTagId: "" });

  const startNew = () => { resetForm(); setEditing("new"); };
  const startEdit = (chain) => { setForm({ name: chain.name, description: chain.description || "", btTagId: chain.btTagId || "" }); setEditing(chain.id); };

  const save = () => {
    if (!form.name.trim()) return alert("請輸入追蹤鏈名稱");
    const id = editing === "new" ? uid() : editing;
    const existing = themeChains.find(c => c.id === id);
    const chain = {
      id,
      name: form.name.trim(),
      description: form.description.trim(),
      btTagId: form.btTagId,
      noteIds: existing?.noteIds || [],
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    const newChains = editing === "new" ? [...themeChains, chain] : themeChains.map(c => c.id === id ? chain : c);
    onUpdate({ ...data, themeChains: newChains });
    setEditing(null);
    setSelected(id);
    resetForm();
  };

  const remove = (chainId) => {
    if (!confirm("確定刪除此追蹤鏈？筆記本身不會被刪除。")) return;
    onUpdate({ ...data, themeChains: themeChains.filter(c => c.id !== chainId) });
    if (selected === chainId) setSelected(null);
  };

  const addNoteToChain = (chainId, noteId) => {
    const newChains = themeChains.map(c => {
      if (c.id !== chainId) return c;
      if (c.noteIds.includes(noteId)) return c;
      return { ...c, noteIds: [...c.noteIds, noteId], updatedAt: Date.now() };
    });
    onUpdate({ ...data, themeChains: newChains });
  };

  const removeNoteFromChain = (chainId, noteId) => {
    const newChains = themeChains.map(c => {
      if (c.id !== chainId) return c;
      return { ...c, noteIds: c.noteIds.filter(id => id !== noteId), updatedAt: Date.now() };
    });
    onUpdate({ ...data, themeChains: newChains });
  };

  const selectedChain = selected ? themeChains.find(c => c.id === selected) : null;

  const chainNotes = useMemo(() => {
    if (!selectedChain) return [];
    return selectedChain.noteIds
      .map(id => notes.find(n => n.id === id))
      .filter(Boolean)
      .sort((a, b) => {
        const oa = BOOK_ORDER[a.bookId] ?? 999;
        const ob = BOOK_ORDER[b.bookId] ?? 999;
        if (oa !== ob) return oa - ob;
        return (parseInt(a.chapterStart) || 0) - (parseInt(b.chapterStart) || 0);
      });
  }, [selectedChain, notes]);

  const availableNotes = useMemo(() => {
    if (!selectedChain) return [];
    const inChain = new Set(selectedChain.noteIds);
    let list = notes.filter(n => !inChain.has(n.id));
    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase();
      list = list.filter(n => {
        const book = BOOK_MAP[n.bookId];
        const ref = book ? `${book.zh} ${book.en}` : "";
        return ref.toLowerCase().includes(q) || (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => BOOK_ORDER[a.bookId] - BOOK_ORDER[b.bookId]);
  }, [selectedChain, notes, noteSearch]);

  const chainBooks = useMemo(() => {
    if (!chainNotes.length) return [];
    return [...new Set(chainNotes.map(n => n.bookId))];
  }, [chainNotes]);

  if (editing) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={() => { setEditing(null); resetForm(); }}><Icons.Back /></button>
            <h2 className="page-title">{editing === "new" ? "新增主題追蹤鏈" : "編輯追蹤鏈"}</h2>
          </div>
          <button className="btn btn-primary" onClick={save}>儲存</button>
        </div>
        <div className="card">
          <div className="field">
            <label className="label">追蹤鏈名稱</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：約的發展 Development of Covenant" />
          </div>
          <div className="field">
            <label className="label">關聯的聖經神學主題（可選）</label>
            <select className="select" value={form.btTagId} onChange={e => setForm({ ...form, btTagId: e.target.value })}>
              <option value="">不關聯特定主題</option>
              {btTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">描述 / 研究問題</label>
            <textarea className="textarea" style={{ minHeight: 80 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="此追蹤鏈要回答什麼問題？追蹤什麼主題的發展？" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">主題追蹤鏈 Theme chains</h2>
        <button className="btn btn-primary" onClick={startNew}><Icons.Plus /> 新增追蹤鏈</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
        <div>
          {themeChains.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 13, padding: 20, textAlign: "center" }}>
              尚無追蹤鏈
            </div>
          ) : (
            themeChains.map(chain => {
              const chainN = chain.noteIds.map(id => notes.find(n => n.id === id)).filter(Boolean);
              const books = [...new Set(chainN.map(n => n.bookId))];
              const linkedTag = btTags.find(t => t.id === chain.btTagId);
              return (
                <div
                  key={chain.id}
                  onClick={() => { setSelected(chain.id); setAddingNote(null); }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    marginBottom: 4,
                    background: selected === chain.id ? "var(--accent-light)" : "transparent",
                    border: selected === chain.id ? "1px solid var(--accent)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: selected === chain.id ? 600 : 400, color: "var(--accent2)" }}>{chain.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {chainN.length} 則筆記 · {books.length} 卷書
                  </div>
                  {linkedTag && (
                    <div style={{ marginTop: 4 }}><TagPill tag={linkedTag} type="bt" /></div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div>
          {!selectedChain ? (
            <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
              {themeChains.length === 0 ? "建立你的第一條追蹤鏈，開始追蹤聖經主題的發展脈絡" : "選擇左側追蹤鏈以檢視"}
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-zh)", fontSize: 18, fontWeight: 700, color: "var(--accent2)" }}>{selectedChain.name}</h3>
                    {selectedChain.description && <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, fontStyle: "italic" }}>{selectedChain.description}</p>}
                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                      <span>{chainNotes.length} 則筆記</span>
                      <span>{chainBooks.length} 卷書</span>
                      <span>
                        {chainBooks.length > 0 && `${BOOK_MAP[chainBooks[0]]?.zh || ""} → ${BOOK_MAP[chainBooks[chainBooks.length - 1]]?.zh || ""}`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => startEdit(selectedChain)}><Icons.Edit /> 編輯</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(selectedChain.id)}><Icons.Trash /></button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>正典順序時間線</span>
                <button className="btn btn-sm" onClick={() => { setAddingNote(addingNote ? null : selectedChain.id); setNoteSearch(""); }}>
                  {addingNote ? "收合" : <><Icons.Plus /> 加入筆記</>}
                </button>
              </div>

              {addingNote === selectedChain.id && (
                <div style={{ marginBottom: 16, background: "var(--bg)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div className="search-box" style={{ marginBottom: 8 }}>
                    <Icons.Search />
                    <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋筆記..." value={noteSearch} onChange={e => setNoteSearch(e.target.value)} />
                  </div>
                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    {availableNotes.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 12 }}>
                        {notes.length === 0 ? "尚無筆記" : "沒有可加入的筆記"}
                      </div>
                    ) : (
                      availableNotes.slice(0, 30).map(n => (
                        <div key={n.id} onClick={() => addNoteToChain(selectedChain.id, n.id)} style={{ padding: "6px 8px", cursor: "pointer", borderRadius: "var(--radius-sm)", marginBottom: 2, transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent2)" }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</span>
                          {n.title && <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {chainNotes.length === 0 ? (
                <div className="card" style={{ textAlign: "center", color: "var(--muted)", padding: 32 }}>
                  此追蹤鏈尚無筆記，點擊「加入筆記」開始建構
                </div>
              ) : (
                <div className="chain-timeline">
                  {chainNotes.map((n, i) => {
                    const book = BOOK_MAP[n.bookId];
                    const prevBook = i > 0 ? chainNotes[i - 1].bookId : null;
                    const showGroupHeader = n.bookId !== prevBook;
                    const group = BIBLE_BOOKS.find(g => g.books.some(b => b.id === n.bookId));
                    return (
                      <div key={n.id}>
                        {showGroupHeader && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4, marginTop: i > 0 ? 12 : 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {book?.zh} {book?.en}
                          </div>
                        )}
                        <div className="chain-node" onClick={() => onNavigate("view-note", { noteId: n.id })}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>
                                {n.chapterStart && `${n.chapterStart}${n.verseStart ? `:${n.verseStart}` : ""}`}
                                {n.chapterEnd && n.chapterEnd !== n.chapterStart && `-${n.chapterEnd}${n.verseEnd ? `:${n.verseEnd}` : ""}`}
                                {!n.chapterEnd && n.verseEnd && n.verseEnd !== n.verseStart && `-${n.verseEnd}`}
                              </div>
                              {n.title && <div style={{ fontSize: 13, color: "var(--text)", marginTop: 2 }}>{n.title}</div>}
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {(n.content || "").replace(/[#*>`\-]/g, "").slice(0, 100)}
                              </div>
                            </div>
                            <button className="btn-ghost" onClick={e => { e.stopPropagation(); removeNoteFromChain(selectedChain.id, n.id); }} title="從追蹤鏈移除" style={{ color: "var(--danger)", flexShrink: 0 }}><Icons.X /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Resources Page ───

function ResourcesPage({ data, onUpdate, onNavigate }) {
  const { resources = [], resourceLinks = [], notes } = data;
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [linking, setLinking] = useState(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const [form, setForm] = useState({ type: "url", title: "", url: "", author: "", publication: "", pages: "", summary: "" });

  const resetForm = () => setForm({ type: "url", title: "", url: "", author: "", publication: "", pages: "", summary: "" });

  const fetchUrlTitle = async (url) => {
    if (!url || !url.startsWith("http")) return;
    setFetchingUrl(true);
    try {
      const res = await fetch(url, { mode: "cors" });
      const text = await res.text();
      const match = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match && match[1]) {
        const title = match[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        setForm(prev => ({ ...prev, title: prev.title || title }));
      }
    } catch (e) {
      // CORS blocked in sandbox — will work on NAS deployment
    }
    setFetchingUrl(false);
  };

  const handleUrlChange = (url) => {
    setForm(prev => ({ ...prev, url }));
    if (url.startsWith("http") && !form.title) {
      fetchUrlTitle(url);
    }
  };

  const startNew = () => { resetForm(); setEditing("new"); };
  const startEdit = (r) => { setForm({ ...r }); setEditing(r.id); };
  const cancel = () => { setEditing(null); resetForm(); };

  const save = () => {
    if (!form.title.trim()) return alert("請輸入標題");
    const id = editing === "new" ? uid() : editing;
    const resource = { ...form, id, title: form.title.trim(), createdAt: editing === "new" ? Date.now() : (resources.find(r => r.id === id)?.createdAt || Date.now()), updatedAt: Date.now() };
    const newResources = editing === "new" ? [...resources, resource] : resources.map(r => r.id === id ? resource : r);
    onUpdate({ ...data, resources: newResources });
    setEditing(null);
    resetForm();
  };

  const remove = (id) => {
    if (!confirm("確定刪除此資料？")) return;
    onUpdate({ ...data, resources: resources.filter(r => r.id !== id), resourceLinks: (resourceLinks || []).filter(l => l.resourceId !== id) });
  };

  const getLinkedNotes = (resId) => {
    const noteIds = (resourceLinks || []).filter(l => l.resourceId === resId).map(l => l.noteId);
    return notes.filter(n => noteIds.includes(n.id));
  };

  const linkNote = (resourceId, noteId) => {
    const exists = (resourceLinks || []).some(l => l.resourceId === resourceId && l.noteId === noteId);
    if (exists) return;
    onUpdate({ ...data, resourceLinks: [...(resourceLinks || []), { resourceId, noteId }] });
    setLinking(null);
  };

  const unlinkNote = (resourceId, noteId) => {
    onUpdate({ ...data, resourceLinks: (resourceLinks || []).filter(l => !(l.resourceId === resourceId && l.noteId === noteId)) });
  };

  const filtered = useMemo(() => {
    let list = [...resources].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    if (filterType) list = list.filter(r => r.type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.title || "").toLowerCase().includes(q) || (r.author || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q) || (r.summary || "").toLowerCase().includes(q));
    }
    return list;
  }, [resources, filterType, search]);

  const unlinkedNotes = useMemo(() => {
    if (!linking) return [];
    const linkedIds = (resourceLinks || []).filter(l => l.resourceId === linking).map(l => l.noteId);
    return notes.filter(n => !linkedIds.includes(n.id)).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [linking, resourceLinks, notes]);

  if (editing) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-ghost" onClick={cancel}><Icons.Back /></button>
            <h2 className="page-title">{editing === "new" ? "新增外部資料" : "編輯外部資料"}</h2>
          </div>
          <button className="btn btn-primary" onClick={save}>儲存</button>
        </div>
        <div className="card">
          <div className="field">
            <label className="label">資料類型</label>
            <div style={{ display: "flex", gap: 8 }}>
              {RESOURCE_TYPES.map(t => (
                <button key={t.id} className={`btn btn-sm ${form.type === t.id ? "btn-primary" : ""}`} onClick={() => setForm({ ...form, type: t.id })}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="label">標題</label>
            <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="資料標題" />
          </div>
          {(form.type === "url" || form.type === "video") && (
            <div className="field">
              <label className="label">{form.type === "video" ? "影片/Podcast 連結" : "網頁連結"}</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="input" style={{ flex: 1 }} value={form.url || ""} onChange={e => handleUrlChange(e.target.value)} placeholder="https://..." />
                <button className="btn btn-sm" onClick={() => fetchUrlTitle(form.url)} disabled={fetchingUrl || !form.url} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                  {fetchingUrl ? "抓取中..." : "抓取標題"}
                </button>
              </div>
              {fetchingUrl && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>正在嘗試抓取網頁標題...</div>}
            </div>
          )}
          {form.type === "book" && (
            <>
              <div className="row">
                <div className="field">
                  <label className="label">作者</label>
                  <input className="input" value={form.author || ""} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="作者姓名" />
                </div>
                <div className="field">
                  <label className="label">出版物/出版社</label>
                  <input className="input" value={form.publication || ""} onChange={e => setForm({ ...form, publication: e.target.value })} placeholder="書名或期刊名" />
                </div>
              </div>
              <div className="field">
                <label className="label">頁數/章節</label>
                <input className="input" value={form.pages || ""} onChange={e => setForm({ ...form, pages: e.target.value })} placeholder="例：pp. 120-135" />
              </div>
            </>
          )}
          {form.type === "video" && (
            <div className="field">
              <label className="label">作者/頻道</label>
              <input className="input" value={form.author || ""} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="頻道或講者" />
            </div>
          )}
          <div className="field">
            <label className="label">摘要備註</label>
            <textarea className="textarea" style={{ minHeight: 100 }} value={form.summary || ""} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="此資料的重點、與你研究的關聯..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">外部資料 Resources</h2>
        <button className="btn btn-primary" onClick={startNew}><Icons.Plus /> 新增資料</button>
      </div>

      <div className="search-box">
        <Icons.Search />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="搜尋資料..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${!filterType ? "btn-primary" : ""}`} onClick={() => setFilterType("")}>全部</button>
        {RESOURCE_TYPES.map(t => (
          <button key={t.id} className={`btn btn-sm ${filterType === t.id ? "btn-primary" : ""}`} onClick={() => setFilterType(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}><Icons.Globe /></div>
          <div>{resources.length === 0 ? "尚無外部資料" : "沒有符合條件的資料"}</div>
          {resources.length === 0 && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={startNew}><Icons.Plus /> 新增第一筆</button>}
        </div>
      ) : (
        filtered.map(r => {
          const linked = getLinkedNotes(r.id);
          const typeInfo = RESOURCE_TYPES.find(t => t.id === r.type);
          return (
            <div key={r.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: r.type === "url" ? "var(--bt-bg)" : r.type === "book" ? "var(--st-bg)" : "#F3EAF9", border: `1px solid ${r.type === "url" ? "var(--bt-border)" : r.type === "book" ? "var(--st-border)" : "#D8C0E8"}`, fontWeight: 500 }}>
                      {typeInfo?.label || r.type}
                    </span>
                    <span className="note-meta">{new Date(r.updatedAt || r.createdAt).toLocaleDateString("zh-TW")}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--accent2)", fontFamily: "var(--font-zh)" }}>{r.title}</div>
                  {r.author && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{r.author}{r.publication ? ` — ${r.publication}` : ""}{r.pages ? ` (${r.pages})` : ""}</div>}
                  {r.url && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2, wordBreak: "break-all" }}>{r.url}</div>}
                  {r.summary && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, fontStyle: "italic" }}>{r.summary}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: 12 }}>
                  <button className="btn-ghost" onClick={() => startEdit(r)} title="編輯"><Icons.Edit /></button>
                  <button className="btn-ghost" onClick={() => remove(r.id)} title="刪除" style={{ color: "var(--danger)" }}><Icons.Trash /></button>
                </div>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>連結的筆記 ({linked.length})</span>
                  <button className="btn btn-sm" onClick={() => setLinking(linking === r.id ? null : r.id)}>
                    <Icons.Plus /> 連結筆記
                  </button>
                </div>
                {linked.map(n => (
                  <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                    <span onClick={() => onNavigate("view-note", { noteId: n.id })} style={{ fontSize: 13, color: "var(--accent2)", cursor: "pointer", fontWeight: 500 }}>
                      {getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}
                      {n.title ? ` — ${n.title}` : ""}
                    </span>
                    <button className="btn-ghost" onClick={() => unlinkNote(r.id, n.id)} style={{ color: "var(--danger)", fontSize: 11 }} title="解除連結"><Icons.X /></button>
                  </div>
                ))}
                {linking === r.id && (
                  <div style={{ marginTop: 8, background: "var(--bg)", padding: 10, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", maxHeight: 200, overflowY: "auto" }}>
                    {unlinkedNotes.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 8 }}>沒有可連結的筆記</div>
                    ) : (
                      unlinkedNotes.map(n => (
                        <div key={n.id} onClick={() => linkNote(r.id, n.id)} style={{ padding: "6px 8px", fontSize: 13, cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <span style={{ fontWeight: 500 }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</span>
                          {n.title && <span style={{ color: "var(--muted)", marginLeft: 6 }}>— {n.title}</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Tag Manager ───
const TAG_COLORS = ["#BA7517","#639922","#854F0B","#1D9E75","#D85A30","#993556","#A32D2D","#534AB7","#0F6E56","#185FA5","#378ADD","#85B7EB","#5DCAA5","#E24B4A","#D4537E","#7F77DD","#D85A30","#993C1D"];

function TagManager({ data, onUpdate }) {
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

  const startEdit = (tag) => {
    setEditId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

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

// ─── Note Templates ───
const NOTE_TEMPLATES = [
  { id: "blank", name: "空白 Blank", content: "" },
  { id: "exegesis", name: "釋經研究 Exegesis", content: `## 經文觀察 Observation
- 關鍵字詞：
- 文法結構：
- 重複/對比/因果：

## 歷史文化背景 Historical Context


## 經文意義 Interpretation


## 神學意涵 Theological Significance


## 正典脈絡 Canonical Context
- 舊約背景：
- 新約發展：
- 救贖歷史位置：

## 應用 Application
` },
  { id: "biblical-theology", name: "聖經神學分析 BT Analysis", content: `## 主題辨識 Theme Identification


## 此段經文中的發展 Development in This Passage


## 之前的經文脈絡 Prior Context
- 首次出現：
- 發展軌跡：

## 之後的發展 Subsequent Development


## 基督論連結 Christological Connection


## 終末成全 Eschatological Fulfillment
` },
  { id: "systematic", name: "系統神學反思 ST Reflection", content: `## 經文摘要 Text Summary


## 教義要點 Doctrinal Points
1. 
2. 
3. 

## 與其他經文的關係 Relation to Other Texts


## 歷史神學觀點 Historical Theology
- 教父時期：
- 改教時期：
- 當代觀點：

## 牧養/實踐意涵 Pastoral Implications
` },
  { id: "word-study", name: "字詞研究 Word Study", content: `## 字詞 Word
- 原文：
- 發音：
- 詞根/詞源：

## 語義範圍 Semantic Range


## 舊約用法 OT Usage


## 新約用法 NT Usage


## 七十士譯本 LXX Usage


## 本段經文中的意義 Meaning in This Passage
` },
];

// ─── Global Search ───
function GlobalSearch({ data, onNavigate, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return { notes: [], resources: [], doctrines: [], chains: [] };
    const q = query.toLowerCase();

    const notes = data.notes.filter(n => {
      const book = BOOK_MAP[n.bookId];
      const ref = book ? `${book.zh} ${book.en}` : "";
      return ref.toLowerCase().includes(q) || (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
    }).slice(0, 8);

    const resources = (data.resources || []).filter(r =>
      (r.title || "").toLowerCase().includes(q) || (r.author || "").toLowerCase().includes(q) || (r.url || "").toLowerCase().includes(q) || (r.summary || "").toLowerCase().includes(q)
    ).slice(0, 5);

    const doctrines = data.stTags.filter(t => t.name.toLowerCase().includes(q));
    const btMatches = data.btTags.filter(t => t.name.toLowerCase().includes(q));

    const chains = (data.themeChains || []).filter(c =>
      c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)
    ).slice(0, 5);

    return { notes, resources, doctrines: [...doctrines, ...btMatches], chains };
  }, [query, data]);

  const hasResults = results.notes.length + results.resources.length + results.doctrines.length + results.chains.length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }} onClick={onClose}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", width: "100%", maxWidth: 560, background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow2)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <Icons.Search />
          <input ref={inputRef} style={{ flex: 1, border: "none", outline: "none", fontSize: 16, background: "transparent", color: "var(--text)" }}
            placeholder="搜尋筆記、資料、教義、追蹤鏈..." value={query} onChange={e => setQuery(e.target.value)} />
          <button className="btn-ghost" onClick={onClose}><Icons.X /></button>
        </div>

        {query.length >= 2 && (
          <div style={{ maxHeight: 400, overflowY: "auto", padding: 8 }}>
            {!hasResults && <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>沒有找到相關結果</div>}

            {results.notes.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>筆記 ({results.notes.length})</div>
                {results.notes.map(n => (
                  <div key={n.id} onClick={() => { onNavigate("view-note", { noteId: n.id }); onClose(); }} style={{ padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{getBookRef(n.bookId, n.chapterStart, n.chapterEnd, n.verseStart, n.verseEnd)}</div>
                    {n.title && <div style={{ fontSize: 12, color: "var(--text)" }}>{n.title}</div>}
                  </div>
                ))}
              </div>
            )}

            {results.chains.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>追蹤鏈 ({results.chains.length})</div>
                {results.chains.map(c => (
                  <div key={c.id} onClick={() => { onNavigate("chains", { chainId: c.id }); onClose(); }} style={{ padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{c.name}</div>
                  </div>
                ))}
              </div>
            )}

            {results.doctrines.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>標籤/教義 ({results.doctrines.length})</div>
                {results.doctrines.map(t => (
                  <div key={t.id} onClick={() => { onNavigate(t.id.startsWith("st-") ? "doctrines" : "notes"); onClose(); }} style={{ padding: "6px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: 6, transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span className="tag-dot" style={{ background: t.color }} /><span style={{ fontSize: 13 }}>{t.name}</span>
                  </div>
                ))}
              </div>
            )}

            {results.resources.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>外部資料 ({results.resources.length})</div>
                {results.resources.map(r => (
                  <div key={r.id} onClick={() => { onNavigate("resources"); onClose(); }} style={{ padding: "8px 10px", cursor: "pointer", borderRadius: "var(--radius-sm)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent2)" }}>{r.title}</div>
                    {r.author && <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.author}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [pageParams, setPageParams] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return window.matchMedia?.("(prefers-color-scheme: dark)").matches; } catch { return false; }
  });
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadData().then(d => {
      setData(d || { ...INIT_DATA });
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(s => !s);
      }
      if (e.key === "Escape") setShowSearch(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const persist = useCallback((newData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const navigate = useCallback((pg, params = {}) => {
    setPage(pg);
    setPageParams(params);
    setSidebarOpen(false);
  }, []);

  const handleSaveNote = useCallback((note, docLinks) => {
    const newData = { ...data };
    const idx = newData.notes.findIndex(n => n.id === note.id);
    if (idx >= 0) newData.notes[idx] = note;
    else newData.notes.push(note);

    newData.doctrineLinks = (newData.doctrineLinks || []).filter(l => l.noteId !== note.id);
    docLinks.forEach(dl => {
      newData.doctrineLinks.push({ noteId: note.id, doctrineId: dl.doctrineId, annotation: dl.annotation });
    });

    persist(newData);
    navigate("view-note", { noteId: note.id });
  }, [data, persist, navigate]);

  const handleDeleteNote = useCallback((noteId) => {
    const newData = {
      ...data,
      notes: data.notes.filter(n => n.id !== noteId),
      doctrineLinks: (data.doctrineLinks || []).filter(l => l.noteId !== noteId),
      resourceLinks: (data.resourceLinks || []).filter(l => l.noteId !== noteId),
      crossRefs: (data.crossRefs || []).filter(r => r.fromId !== noteId && r.toId !== noteId),
      themeChains: (data.themeChains || []).map(c => ({ ...c, noteIds: (c.noteIds || []).filter(id => id !== noteId) })),
    };
    persist(newData);
    navigate("notes");
  }, [data, persist, navigate]);

  if (loading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "var(--font-zh)", color: "var(--muted)" }}>
        <style>{CSS}</style>
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
      case "dashboard":
        return <Dashboard data={data} onNavigate={navigate} />;
      case "notes":
        return <NotesList data={data} onNavigate={navigate} initialFilter={pageParams} />;
      case "new-note":
        return <NoteEditor data={data} onSave={handleSaveNote} onCancel={() => navigate("notes")} onNavigate={navigate} />;
      case "edit-note":
        return <NoteEditor data={data} noteId={pageParams.noteId} onSave={handleSaveNote} onCancel={() => navigate("view-note", { noteId: pageParams.noteId })} onNavigate={navigate} />;
      case "view-note":
        return <NoteView data={data} noteId={pageParams.noteId} onNavigate={navigate} onDelete={handleDeleteNote} onUpdate={persist} />;
      case "doctrines":
        return <DoctrinePage data={data} onNavigate={navigate} />;
      case "chains":
        return <ThemeChainPage data={data} onUpdate={persist} onNavigate={navigate} initialChainId={pageParams.chainId} />;
      case "resources":
        return <ResourcesPage data={data} onUpdate={persist} onNavigate={navigate} />;
      case "tags":
        return <TagManager data={data} onUpdate={persist} />;
      default:
        return <Dashboard data={data} onNavigate={navigate} />;
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className={`app-root ${darkMode ? "dark" : ""}`}>
        {showSearch && data && <GlobalSearch data={data} onNavigate={navigate} onClose={() => setShowSearch(false)} />}
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
            <button className="btn btn-sm btn-ghost" onClick={() => setDarkMode(d => !d)} title={darkMode ? "切換亮色" : "切換深色"}>
              {darkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => navigate("new-note")}>
              <Icons.Plus /> 新增筆記
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `bible-notebook-backup-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}>匯出備份</button>
              <button className="btn btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".json";
                input.onchange = async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const imported = JSON.parse(text);
                    if (imported.notes && Array.isArray(imported.notes)) {
                      if (confirm(`確定匯入？將覆蓋現有資料（${imported.notes.length} 則筆記）`)) {
                        persist(imported);
                        navigate("dashboard");
                      }
                    } else { alert("檔案格式不正確"); }
                  } catch { alert("檔案讀取失敗"); }
                };
                input.click();
              }}>匯入還原</button>
            </div>
          </div>
        </nav>

        <div className="main">
          {renderPage()}
        </div>
      </div>
    </>
  );
}
