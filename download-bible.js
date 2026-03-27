#!/usr/bin/env node
/**
 * download-bible.js
 * Downloads all Bible data for offline use.
 * Run once before building: node download-bible.js
 *
 * Downloads:
 *   CUV  — Chinese Union Version (bible-api.com)
 *   WEB  — World English Bible   (bible-api.com)
 *   TISCH — Tischendorf Greek NT  (bolls.life, NT books only)
 *   WLC  — Westminster Leningrad Codex Hebrew OT (bolls.life, OT only)
 *
 * Output: backend/src/bible-data/{cuv,web,tisch,wlc}/{bookId}.json
 *   Each file: { "1": [{verse,text},...], "2": [...], ... }
 */

const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

const OUT = path.join(__dirname, 'backend/src/bible-data');

// ── Chapter counts (Protestant canon) ────────────────────────────────────
const CHAPTERS = {
  gen:50, exo:40, lev:27, num:36, deu:34, jos:24, jdg:21, rut:4,
  '1sa':31,'2sa':24,'1ki':22,'2ki':25,'1ch':29,'2ch':36,
  ezr:10, neh:13, est:10, job:42, psa:150, pro:31, ecc:12, sng:8,
  isa:66, jer:52, lam:5,  ezk:48, dan:12, hos:14, jol:3,  amo:9,
  oba:1,  jon:4,  mic:7,  nah:3,  hab:3,  zep:3,  hag:2,  zec:14, mal:4,
  mat:28, mrk:16, luk:24, jhn:21, act:28, rom:16,
  '1co':16,'2co':13, gal:6, eph:6, php:4, col:4,
  '1th':5,'2th':3,'1ti':6,'2ti':4, tit:3, phm:1,
  heb:13, jas:5,'1pe':5,'2pe':3,'1jn':5,'2jn':1,'3jn':1, jud:1, rev:22,
};

const NT = new Set([
  'mat','mrk','luk','jhn','act','rom','1co','2co','gal','eph',
  'php','col','1th','2th','1ti','2ti','tit','phm','heb','jas',
  '1pe','2pe','1jn','2jn','3jn','jud','rev',
]);

const BOLLS = {
  gen:1,  exo:2,  lev:3,  num:4,  deu:5,  jos:6,  jdg:7,  rut:8,
  '1sa':9,'2sa':10,'1ki':11,'2ki':12,'1ch':13,'2ch':14,
  ezr:15, neh:16, est:17, job:18, psa:19, pro:20, ecc:21,
  sng:22, isa:23, jer:24, lam:25, ezk:26, dan:27, hos:28,
  jol:29, amo:30, oba:31, jon:32, mic:33, nah:34, hab:35,
  zep:36, hag:37, zec:38, mal:39,
  mat:40, mrk:41, luk:42, jhn:43, act:44, rom:45,
  '1co':46,'2co':47, gal:48, eph:49, php:50, col:51,
  '1th':52,'2th':53,'1ti':54,'2ti':55, tit:56, phm:57,
  heb:58, jas:59,'1pe':60,'2pe':61,'1jn':62,'2jn':63,
  '3jn':64, jud:65, rev:66,
};

// ── Helpers ───────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function stripStrongs(text) {
  return text.replace(/<S>\d+<\/S>/g, '').replace(/\s+/g, ' ').trim();
}

async function get(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { timeout: 20000 });
      if (res.ok) return res;
    } catch {}
    if (i < retries - 1) await sleep(1000 * (i + 1));
  }
  return null;
}

// ── Fetch one chapter ─────────────────────────────────────────────────────
async function fetchBibleApi(bookId, ch) {
  const [rc, rw] = await Promise.all([
    get(`https://bible-api.com/${bookId}+${ch}?translation=cuv`),
    get(`https://bible-api.com/${bookId}+${ch}?translation=web`),
  ]);
  let cuv = null, web = null;
  if (rc) { const d = await rc.json(); if (d.verses?.length) cuv = d.verses.map(v => ({ verse: v.verse, text: v.text.trim() })); }
  if (rw) { const d = await rw.json(); if (d.verses?.length) web = d.verses.map(v => ({ verse: v.verse, text: v.text.trim() })); }
  return { cuv, web };
}

async function fetchOrig(bookId, ch) {
  const isNT = NT.has(bookId);
  const tr   = isNT ? 'TISCH' : 'WLC';
  const res  = await get(`https://bolls.life/get-chapter/${tr}/${BOLLS[bookId]}/${ch}/`);
  if (!res) return null;
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return null;
  return data.map(v => ({ verse: v.verse, text: isNT ? stripStrongs(v.text) : v.text }));
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const books = Object.keys(CHAPTERS);
  const total = books.length;
  let totalChapters = 0, done = 0;
  Object.values(CHAPTERS).forEach(c => totalChapters += c);

  for (const dir of ['cuv','web','tisch','wlc'])
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });

  console.log(`\n聖經資料下載工具`);
  console.log(`=================`);
  console.log(`書卷：${total}，總章數：${totalChapters}`);
  console.log(`輸出目錄：${OUT}\n`);

  for (let bi = 0; bi < books.length; bi++) {
    const bookId = books[bi];
    const isNT   = NT.has(bookId);
    const chMax  = CHAPTERS[bookId];

    const cuvFile  = path.join(OUT, 'cuv',             `${bookId}.json`);
    const webFile  = path.join(OUT, 'web',             `${bookId}.json`);
    const origFile = path.join(OUT, isNT ? 'tisch' : 'wlc', `${bookId}.json`);

    if (fs.existsSync(cuvFile) && fs.existsSync(webFile) && fs.existsSync(origFile)) {
      console.log(`[${bi+1}/${total}] ${bookId.padEnd(4)} ✓ 已下載`);
      done += chMax;
      continue;
    }

    process.stdout.write(`[${bi+1}/${total}] ${bookId.padEnd(4)} `);

    const cuvBook = {}, webBook = {}, origBook = {};

    for (let ch = 1; ch <= chMax; ch++) {
      process.stdout.write(`${ch}`);

      const { cuv, web } = await fetchBibleApi(bookId, ch);
      if (cuv) cuvBook[ch] = cuv;
      if (web) webBook[ch] = web;

      const orig = await fetchOrig(bookId, ch);
      if (orig) origBook[ch] = orig;

      done++;
      process.stdout.write(ch < chMax ? '.' : '');
      await sleep(120);
    }

    fs.writeFileSync(cuvFile,  JSON.stringify(cuvBook));
    fs.writeFileSync(webFile,  JSON.stringify(webBook));
    fs.writeFileSync(origFile, JSON.stringify(origBook));

    const pct = Math.round(done / totalChapters * 100);
    console.log(` ✓  [${pct}%]`);
  }

  console.log('\n✅ 下載完成！可以執行 npm run electron:build 了。\n');
}

main().catch(e => { console.error('下載失敗:', e); process.exit(1); });
