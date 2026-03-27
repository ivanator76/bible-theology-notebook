#!/usr/bin/env node
/**
 * verify-bible.js
 * Verifies that all Bible data files are complete (no downloading).
 * Run: node verify-bible.js
 */

const fs   = require('fs');
const path = require('path');

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

const TR_LABELS = { cuv: '中文 CUV', web: 'English WEB', tisch: '希臘文 TISCH', wlc: '希伯來文 WLC' };

let totalExpected = 0;
let totalOk       = 0;
const problems    = [];

for (const [bookId, chMax] of Object.entries(CHAPTERS)) {
  const isNT   = NT.has(bookId);
  const origTr = isNT ? 'tisch' : 'wlc';

  for (const tr of ['cuv', 'web', origTr]) {
    const file = path.join(OUT, tr, `${bookId}.json`);
    totalExpected += chMax;

    if (!fs.existsSync(file)) {
      problems.push(`  ✗ ${TR_LABELS[tr].padEnd(18)} ${bookId}: 檔案不存在`);
      continue;
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      problems.push(`  ✗ ${TR_LABELS[tr].padEnd(18)} ${bookId}: JSON 格式錯誤`);
      continue;
    }

    const missingCh = [];
    for (let ch = 1; ch <= chMax; ch++) {
      if (!data[String(ch)] || !data[String(ch)].length) {
        missingCh.push(ch);
      } else {
        totalOk++;
      }
    }

    if (missingCh.length) {
      problems.push(`  ✗ ${TR_LABELS[tr].padEnd(18)} ${bookId}: 缺少第 ${missingCh.join(', ')} 章`);
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log('\n聖經資料完整性驗證');
console.log('==================');
console.log(`資料目錄：${OUT}`);
console.log(`涵蓋版本：中文 CUV、英文 WEB、希臘文 TISCH（新約）、希伯來文 WLC（舊約）\n`);

if (problems.length === 0) {
  console.log(`✅  全部完整！共 ${totalOk.toLocaleString()} 章，四個版本皆無缺失。\n`);
  process.exit(0);
} else {
  console.log(`⚠️  發現 ${problems.length} 個問題（${totalOk}/${totalExpected} 章正常）：\n`);
  problems.forEach(p => console.log(p));
  console.log('\n→ 執行 npm run bible:check 可自動修補缺失的章節。\n');
  process.exit(1);
}
