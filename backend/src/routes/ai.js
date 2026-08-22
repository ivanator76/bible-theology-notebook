const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const db = require('../db');
const { getActiveProvider } = require('../aiProviders');

router.get('/status', (req, res) => {
  const cfg = getActiveProvider();
  res.json({ hasKey: !!cfg, provider: cfg?.provider || null, model: cfg?.model || null });
});

// ── Prompts ────────────────────────────────────────────────────────────────
const PROMPTS = {
  related_scriptures: (note, btTags, stTags, scripture) =>
    `你是一位聖經神學學者。根據以下聖經研究筆記，請建議 5-8 段相關經文，這些經文在主題、神學概念或正典脈絡上與此段落有相關聯繫。對每段經文，請簡要說明關聯原因。

筆記經文範圍：${note.ref}${note.title ? `\n筆記標題：${note.title}` : ''}
筆記內容：
${note.content}
${btTags.length ? `\n聖經神學主題標籤：${btTags.join('、')}` : ''}
${stTags.length ? `\n系統神學標籤：${stTags.join('、')}` : ''}
${scripture ? `\n經文內容：${scripture}` : ''}

請用繁體中文回答。格式：條列各段相關經文（書名 章:節），並附上 1-2 句說明其關聯的理由。`,

  doctrine_links: (note, btTags, stTags, scripture) =>
    `你是一位系統神學學者。根據以下聖經研究筆記，分析此段落如何貢獻於系統神學各教義。

筆記經文範圍：${note.ref}${note.title ? `\n筆記標題：${note.title}` : ''}
筆記內容：
${note.content}
${scripture ? `\n經文內容：${scripture}` : ''}

使用者系統中的教義分類（請優先從此清單中選擇）：
${stTags.map(t => `• ${t}`).join('\n')}

請建議 2-4 個最相關的教義分類，說明：
1. 此段落如何貢獻或說明這個教義
2. 具體的神學連結點是什麼
3. 此段落對理解這個教義有何獨特的貢獻

請用繁體中文回答，格式清晰易讀。`,

  research_directions: (note, btTags, stTags, scripture) =>
    `你是一位聖經研究教授。根據以下聖經研究筆記，建議 3-5 個值得深入探索的研究方向或問題。

筆記經文範圍：${note.ref}${note.title ? `\n筆記標題：${note.title}` : ''}
筆記內容：
${note.content}
${btTags.length ? `\n聖經神學主題標籤：${btTags.join('、')}` : ''}
${stTags.length ? `\n系統神學標籤：${stTags.join('、')}` : ''}
${scripture ? `\n經文內容：${scripture}` : ''}

請考慮以下方向提供建議：
- 正典關聯與聖經神學發展脈絡
- 歷史文化背景研究
- 跨文本比較與主題研究
- 此段落引發的重要神學問題
- 推薦的下一步研讀段落或主題

請用繁體中文回答，每個方向附上具體的研究問題或切入點。`,
};

const JSON_SCHEMAS = {
  related_scriptures: `只回傳 JSON，不要 Markdown。格式：{"summary":"一句總結","items":[{"bookId":"rom","chapterStart":"8","verseStart":"1","chapterEnd":"8","verseEnd":"4","reference":"羅馬書 8:1-4","reason":"關聯理由"}]}。bookId 必須使用英文縮寫（如 gen、exo、mat、jhn、rom、1co）。`,
  doctrine_links: `只回傳 JSON，不要 Markdown。格式：{"summary":"一句總結","items":[{"doctrineId":"st-soteriology","doctrineName":"救恩論 Soteriology","annotation":"可直接寫入知識庫的教義註解","contribution":"獨特貢獻"}]}。doctrineId 必須從使用者提供的教義分類選擇。`,
  research_directions: `只回傳 JSON，不要 Markdown。格式：{"summary":"一句總結","items":[{"title":"研究方向","question":"具體問題","nextStep":"下一步研讀建議"}]}。`,
};

function parseStructuredResult(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return { ...parsed, items: items.map(item => ({ ...item, status: item.status || 'pending' })) };
  } catch {
    return { summary: '', items: [], rawText: text };
  }
}

function serializeSuggestion(row) {
  return {
    id: row.id, noteId: row.note_id, type: row.type, provider: row.provider,
    result: JSON.parse(row.result_json || '{}'), rawText: row.raw_text,
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

// ── Provider call helpers ──────────────────────────────────────────────────
async function callAnthropic(key, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
    timeout: 60000,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error?.message || `Anthropic 錯誤 ${res.status}`), { status: res.status });
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callOpenAI(key, prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
    timeout: 60000,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error?.message || `OpenAI 錯誤 ${res.status}`), { status: res.status });
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGoogle(key, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1500 },
      }),
      timeout: 60000,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error?.message || `Google 錯誤 ${res.status}`), { status: res.status });
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callOpenRouter(key, prompt, model) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Title': 'Bible Theology Notebook',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
    timeout: 60000,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const message = data.error?.message || `OpenRouter 錯誤 ${res.status}`;
    throw Object.assign(new Error(`${message}（模型：${model}）`), { status: res.ok ? 502 : res.status });
  }
  // Reasoning models sometimes leave `content` empty and put the answer in `reasoning`.
  const message = data.choices?.[0]?.message;
  const text = message?.content || message?.reasoning;
  if (!text) throw Object.assign(new Error(`OpenRouter 模型 ${model} 沒有回傳內容`), { status: 502 });
  return text;
}

const CALLERS = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  google: callGoogle,
  openrouter: callOpenRouter,
};

router.get('/note/:noteId', (req, res) => {
  const rows = db.prepare('SELECT * FROM ai_suggestions WHERE note_id = ? ORDER BY created_at DESC').all(req.params.noteId);
  res.json(rows.map(serializeSuggestion));
});

router.patch('/suggestions/:id/items/:itemIndex', (req, res) => {
  const row = db.prepare('SELECT * FROM ai_suggestions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '找不到 AI 建議' });
  const result = JSON.parse(row.result_json || '{}');
  const index = parseInt(req.params.itemIndex, 10);
  const item = result.items?.[index];
  const action = req.body.action;
  if (!item || !['adopt', 'ignore'].includes(action)) return res.status(400).json({ error: '無效的建議項目或動作' });

  const tx = db.transaction(() => {
    if (action === 'adopt' && row.type === 'doctrine_links') {
      if (!item.doctrineId) throw new Error('建議缺少 doctrineId');
      const existing = db.prepare('SELECT id FROM doctrine_links WHERE note_id = ? AND doctrine_id = ?').get(row.note_id, item.doctrineId);
      if (existing) {
        db.prepare('UPDATE doctrine_links SET annotation = ? WHERE id = ?').run(item.annotation || item.contribution || '', existing.id);
      } else {
        db.prepare('INSERT INTO doctrine_links (note_id, doctrine_id, annotation) VALUES (?, ?, ?)')
          .run(row.note_id, item.doctrineId, item.annotation || item.contribution || '');
      }
    }
    if (action === 'adopt' && row.type === 'related_scriptures') {
      const targetNoteId = req.body.targetNoteId;
      if (!targetNoteId) throw new Error('這段經文尚無可連結的筆記');
      const target = db.prepare('SELECT id FROM notes WHERE id = ?').get(targetNoteId);
      if (!target) throw new Error('找不到目標筆記');
      const duplicate = db.prepare(`SELECT id FROM cross_refs WHERE
        (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)`).get(row.note_id, targetNoteId, targetNoteId, row.note_id);
      if (!duplicate) {
        db.prepare('INSERT INTO cross_refs (id, from_id, to_id, annotation, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(`ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, row.note_id, targetNoteId, item.reason || '', Date.now());
      }
    }
    item.status = action === 'adopt' ? 'adopted' : 'ignored';
    item.targetNoteId = req.body.targetNoteId || item.targetNoteId || null;
    const statuses = result.items.map(entry => entry.status || 'pending');
    const overall = statuses.includes('pending') ? 'pending' : (statuses.includes('adopted') ? 'adopted' : 'ignored');
    db.prepare('UPDATE ai_suggestions SET result_json = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(result), overall, Date.now(), row.id);
  });
  try {
    tx();
    if (row.type === 'doctrine_links') db.rebuildSearchIndex();
    res.json(serializeSuggestion(db.prepare('SELECT * FROM ai_suggestions WHERE id = ?').get(row.id)));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── POST /api/ai/suggest ───────────────────────────────────────────────────
router.post('/suggest', async (req, res) => {
  const cfg = getActiveProvider();
  if (!cfg) return res.status(403).json({ error: '尚未設定 API Key' });

  const { type, noteId, note, btTags = [], stTags = [], scripture } = req.body;
  const buildPrompt = PROMPTS[type];
  if (!buildPrompt) return res.status(400).json({ error: '未知的建議類型' });

  try {
    const prompt = `${buildPrompt(note, btTags, stTags, scripture)}\n\n${JSON_SCHEMAS[type]}`;
    const rawText = await CALLERS[cfg.provider](cfg.key, prompt, cfg.model);
    const result = parseStructuredResult(rawText);
    let suggestion = null;
    if (noteId && db.prepare('SELECT id FROM notes WHERE id = ?').get(noteId)) {
      const now = Date.now();
      const info = db.prepare(`INSERT INTO ai_suggestions
        (note_id, type, provider, result_json, raw_text, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`).run(noteId, type, cfg.provider, JSON.stringify(result), rawText, now, now);
      suggestion = serializeSuggestion(db.prepare('SELECT * FROM ai_suggestions WHERE id = ?').get(info.lastInsertRowid));
    }
    res.json({ result, suggestion, rawText: result.items.length ? undefined : rawText });
  } catch (e) {
    console.error('AI suggest error:', e);
    res.status(e.status || 500).json({ error: e.message });
  }
});

module.exports = router;
