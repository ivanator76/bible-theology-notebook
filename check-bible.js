#!/usr/bin/env node
/**
 * check-bible.js
 * Checks all downloaded Bible data for missing chapters and repairs them.
 * Run: node check-bible.js
 */

const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

const OUT = path.join(__dirname, 'backend/src/bible-data');

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

async function main() {
  const books = Object.keys(CHAPTERS);
  const missing = [];

  // ── Step 1: Scan for missing chapters ──────────────────────────────────
  console.log('掃描缺失的章節...\n');

  for (const bookId of books) {
    const isNT   = NT.has(bookId);
    const chMax  = CHAPTERS[bookId];
    const origTr = isNT ? 'tisch' : 'wlc';

    for (const tr of ['cuv', 'web', origTr]) {
      const file = path.join(OUT, tr, `${bookId}.json`);
      if (!fs.existsSync(file)) {
        for (let ch = 1; ch <= chMax; ch++) missing.push({ bookId, ch, tr });
        continue;
      }
      let data;
      try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { data = {}; }
      for (let ch = 1; ch <= chMax; ch++) {
        if (!data[String(ch)] || !data[String(ch)].length) {
          missing.push({ bookId, ch, tr });
        }
      }
    }
  }

  if (missing.length === 0) {
    console.log('✅ 所有資料完整，無需修補。');
    return;
  }

  // Group by book + translation
  const grouped = {};
  for (const { bookId, ch, tr } of missing) {
    const key = `${tr}/${bookId}`;
    if (!grouped[key]) grouped[key] = { bookId, tr, chapters: [] };
    grouped[key].chapters.push(ch);
  }

  const entries = Object.values(grouped);
  console.log(`發現 ${missing.length} 個缺失章節，分佈在 ${entries.length} 個書卷/版本組合。`);
  for (const { bookId, tr, chapters } of entries) {
    console.log(`  ${tr}/${bookId}: 章 ${chapters.join(', ')}`);
  }

  // ── Step 2: Repair ─────────────────────────────────────────────────────
  console.log('\n開始修補...\n');

  // Collect all unique book+tr pairs and repair chapter by chapter
  for (const { bookId, tr, chapters } of entries) {
    const isNT  = NT.has(bookId);
    const file  = path.join(OUT, tr, `${bookId}.json`);
    let data = {};
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

    process.stdout.write(`修補 ${tr}/${bookId} (${chapters.length} 章): `);

    for (const ch of chapters) {
      try {
        if (tr === 'cuv') {
          const res = await get(`https://bible-api.com/${bookId}+${ch}?translation=cuv`);
          if (res) {
            const d = await res.json();
            if (d.verses?.length) data[String(ch)] = d.verses.map(v => ({ verse: v.verse, text: v.text.trim() }));
          }
        } else if (tr === 'web') {
          const res = await get(`https://bible-api.com/${bookId}+${ch}?translation=web`);
          if (res) {
            const d = await res.json();
            if (d.verses?.length) data[String(ch)] = d.verses.map(v => ({ verse: v.verse, text: v.text.trim() }));
          }
        } else {
          const trCode = isNT ? 'TISCH' : 'WLC';
          const res = await get(`https://bolls.life/get-chapter/${trCode}/${BOLLS[bookId]}/${ch}/`);
          if (res) {
            const d = await res.json();
            if (Array.isArray(d) && d.length) {
              data[String(ch)] = d.map(v => ({ verse: v.verse, text: isNT ? stripStrongs(v.text) : v.text }));
            }
          }
        }
      } catch {}
      process.stdout.write('.');
      await sleep(150);
    }

    fs.mkdirSync(path.join(OUT, tr), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
    console.log(' ✓');
  }

  console.log('\n✅ 修補完成！請重新執行 npm run electron:build。\n');
}

main().catch(e => { console.error('錯誤:', e); process.exit(1); });
