const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const fs = require('fs');

function settingsPath() {
  return process.env.SETTINGS_PATH ||
    require('path').join(__dirname, '../../data/settings.json');
}

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); }
  catch { return {}; }
}

const PROVIDERS = {
  anthropic: { envVar: 'ANTHROPIC_API_KEY', settingKey: 'anthropicApiKey' },
  openai:    { envVar: 'OPENAI_API_KEY',    settingKey: 'openaiApiKey' },
  google:    { envVar: 'GOOGLE_API_KEY',    settingKey: 'googleApiKey' },
};

function getActiveProvider() {
  const settings = readSettings();
  const active = settings.aiProvider || 'anthropic';

  // Try active provider first, then fall back to any available
  const order = [active, ...Object.keys(PROVIDERS).filter(p => p !== active)];
  for (const id of order) {
    const cfg = PROVIDERS[id];
    const key = process.env[cfg.envVar] || settings[cfg.settingKey];
    if (key) return { provider: id, key };
  }
  return null;
}

router.get('/status', (req, res) => {
  const cfg = getActiveProvider();
  res.json({ hasKey: !!cfg, provider: cfg?.provider || null });
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

const CALLERS = { anthropic: callAnthropic, openai: callOpenAI, google: callGoogle };

// ── POST /api/ai/suggest ───────────────────────────────────────────────────
router.post('/suggest', async (req, res) => {
  const cfg = getActiveProvider();
  if (!cfg) return res.status(403).json({ error: '尚未設定 API Key' });

  const { type, note, btTags = [], stTags = [], scripture } = req.body;
  const buildPrompt = PROMPTS[type];
  if (!buildPrompt) return res.status(400).json({ error: '未知的建議類型' });

  try {
    const prompt = buildPrompt(note, btTags, stTags, scripture);
    const result = await CALLERS[cfg.provider](cfg.key, prompt);
    res.json({ result });
  } catch (e) {
    console.error('AI suggest error:', e);
    res.status(e.status || 500).json({ error: e.message });
  }
});

module.exports = router;
