const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

function settingsPath() {
  return process.env.SETTINGS_PATH || path.join(__dirname, '../../data/settings.json');
}

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); }
  catch { return {}; }
}

function writeSettings(s) {
  const p = settingsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(s, null, 2));
}

const PROVIDERS = {
  anthropic: { envVar: 'ANTHROPIC_API_KEY', settingKey: 'anthropicApiKey', label: 'Anthropic' },
  openai:    { envVar: 'OPENAI_API_KEY',    settingKey: 'openaiApiKey',    label: 'OpenAI' },
  google:    { envVar: 'GOOGLE_API_KEY',    settingKey: 'googleApiKey',    label: 'Google' },
};

// GET /api/settings
router.get('/', (req, res) => {
  const settings = readSettings();

  const providers = {};
  for (const [id, cfg] of Object.entries(PROVIDERS)) {
    const fromEnv  = !!process.env[cfg.envVar];
    const fileKey  = settings[cfg.settingKey] || '';
    const fromFile = !!fileKey;
    const key      = fromEnv ? process.env[cfg.envVar] : fileKey;
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

module.exports = router;
