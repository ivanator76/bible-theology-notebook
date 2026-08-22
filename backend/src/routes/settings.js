const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const {
  PROVIDERS, DEFAULT_OPENROUTER_MODEL,
  readSettings, writeSettings, openRouterModel,
} = require('../aiProviders');

// GET /api/settings
router.get('/', (req, res) => {
  const settings = readSettings();

  const providers = {};
  for (const [id, cfg] of Object.entries(PROVIDERS)) {
    const fromEnv  = !!process.env[cfg.envVar];
    const fileKey  = settings[cfg.settingKey] || '';
    const fromFile = !!fileKey;
    providers[id] = {
      hasKey:    fromEnv || fromFile,
      source:    fromEnv ? 'env' : fromFile ? 'file' : null,
      maskedKey: fromFile && fileKey
        ? fileKey.slice(0, 12) + '...' + fileKey.slice(-4)
        : null,
    };
  }

  // Resolve active provider: explicit setting > first provider with key > anthropic
  const activeProvider =
    settings.aiProvider ||
    Object.keys(PROVIDERS).find(id => providers[id].hasKey) ||
    'anthropic';

  res.json({
    hasAiKey: Object.values(providers).some(p => p.hasKey),
    activeProvider,
    providers,
    openrouterModel: openRouterModel(settings),
    openrouterModelDefault: DEFAULT_OPENROUTER_MODEL,
    openrouterModelFromEnv: !settings.openrouterModel && !!process.env.OPENROUTER_MODEL,
    // Legacy fields for old clients
    source: providers[activeProvider]?.source,
    maskedKey: providers[activeProvider]?.maskedKey,
  });
});

// POST /api/settings/ai-key  { provider, key }
router.post('/ai-key', (req, res) => {
  const { provider, key } = req.body;
  if (!PROVIDERS[provider]) return res.status(400).json({ error: 'Unknown provider' });

  const s = readSettings();
  const settingKey = PROVIDERS[provider].settingKey;

  if (key && key.trim()) {
    s[settingKey] = key.trim();
    s.aiProvider = provider;   // auto-activate when saving a new key
  } else {
    delete s[settingKey];
    // If the deleted key was the active one, fall back to first available
    if (s.aiProvider === provider) {
      const next = Object.keys(PROVIDERS).find(id => id !== provider && s[PROVIDERS[id].settingKey]);
      if (next) s.aiProvider = next;
      else delete s.aiProvider;
    }
  }
  writeSettings(s);
  res.json({ ok: true });
});

// POST /api/settings/ai-provider  { provider }
router.post('/ai-provider', (req, res) => {
  const { provider } = req.body;
  if (!PROVIDERS[provider]) return res.status(400).json({ error: 'Unknown provider' });
  const s = readSettings();
  s.aiProvider = provider;
  writeSettings(s);
  res.json({ ok: true });
});

// POST /api/settings/openrouter-model  { model }
router.post('/openrouter-model', (req, res) => {
  const model = String(req.body.model || '').trim();
  const s = readSettings();
  if (model) s.openrouterModel = model;
  else delete s.openrouterModel;   // fall back to env var or built-in default
  writeSettings(s);
  res.json({ ok: true, model: openRouterModel(s) });
});

// OpenRouter's catalogue is public and large, so proxy it and cache for an hour
// instead of shipping a hard-coded list that goes stale.
let modelCache = { at: 0, models: [] };
let inFlight = null;

async function fetchOpenRouterModels() {
  const response = await fetch('https://openrouter.ai/api/v1/models', { timeout: 15000 });
  if (!response.ok) throw new Error(`OpenRouter 錯誤 ${response.status}`);
  const data = await response.json();
  const models = (data.data || [])
    .map(m => ({
      id: m.id,
      name: m.name,
      contextLength: m.context_length,
      promptPrice: m.pricing?.prompt,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  modelCache = { at: Date.now(), models };
  return models;
}

router.get('/openrouter-models', async (req, res) => {
  if (Date.now() - modelCache.at < 3600000 && modelCache.models.length) {
    return res.json({ models: modelCache.models, cached: true });
  }
  try {
    // Collapse concurrent callers onto one upstream request so a burst of them
    // can't half-succeed and hand different answers back to the same client.
    if (!inFlight) inFlight = fetchOpenRouterModels().finally(() => { inFlight = null; });
    res.json({ models: await inFlight, cached: false });
  } catch (error) {
    // A failed catalogue fetch must not block typing a model id by hand.
    res.json({ models: modelCache.models, error: error.message });
  }
});

module.exports = router;
