#!/usr/bin/env node
/**
 * fix-bible-edge-cases.js
 * Fixes two known edge cases in the offline Bible data:
 *
 *  1. Nahum CUV: bible-api.com uses 'nam' (not 'nah') for Nahum in CUV
 *  2. Malachi WLC: Hebrew Bible has only 3 chapters; Protestant ch.4 (vv.1-6)
 *     corresponds to WLC ch.3 vv.19-24, which must be extracted and re-numbered.
 */

const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

const OUT   = path.join(__dirname, 'backend/src/bible-data');
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  console.log('\n修復聖經資料邊緣案例...\n');

  // ── Fix 1: Nahum CUV (bible-api.com uses 'nam' for nah in CUV) ─────────
  console.log('1. 修復那鴻書 CUV (nah → nam)...');
  {
    const file = path.join(OUT, 'cuv', 'nah.json');
    let data = {};
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

    for (let ch = 1; ch <= 3; ch++) {
      process.stdout.write(`   第 ${ch} 章... `);
      const res = await get(`https://bible-api.com/nam+${ch}?translation=cuv`);
      if (res) {
        const d = await res.json();
        if (d.verses?.length) {
          data[String(ch)] = d.verses.map(v => ({ verse: v.verse, text: v.text.trim() }));
          console.log(`✓ (${d.verses.length} 節)`);
        } else {
          console.log('✗ 空回應');
        }
      } else {
        console.log('✗ 連線失敗');
      }
      await sleep(200);
    }

    fs.mkdirSync(path.join(OUT, 'cuv'), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
    console.log('   已儲存 nah.json\n');
  }

  // ── Fix 2: Malachi WLC ch.4 = WLC ch.3 vv.19-24, re-numbered as vv.1-6 ─
  console.log('2. 修復瑪拉基書 WLC 第 4 章（從第 3 章第 19-24 節提取）...');
  {
    const file = path.join(OUT, 'wlc', 'mal.json');
    let data = {};
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

    // Fetch WLC Malachi chapter 3 to get all 24 verses
    process.stdout.write('   下載第 3 章（24 節）... ');
    const res = await get('https://bolls.life/get-chapter/WLC/39/3/');
    if (res) {
      const verses = await res.json();
      if (Array.isArray(verses) && verses.length === 24) {
        // Store ch.3 as vv.1-18 (Protestant ch.3)
        data['3'] = verses.slice(0, 18).map(v => ({ verse: v.verse, text: v.text }));
        // Store ch.4 as vv.19-24 re-numbered as 1-6 (Protestant ch.4)
        data['4'] = verses.slice(18).map((v, i) => ({ verse: i + 1, text: v.text }));
        console.log(`✓ (ch.3: 18 節, ch.4: 6 節)`);
      } else {
        console.log(`✗ 預期 24 節，實得 ${Array.isArray(verses) ? verses.length : '非陣列'}`);
      }
    } else {
      console.log('✗ 連線失敗');
    }

    fs.mkdirSync(path.join(OUT, 'wlc'), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
    console.log('   已儲存 mal.json\n');
  }

  console.log('✅ 完成！執行 npm run bible:verify 確認結果。\n');
}

main().catch(e => { console.error('錯誤:', e); process.exit(1); });
