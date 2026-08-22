const fs = require('fs');
const path = require('path');

const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.5';

const PROVIDERS = {
  anthropic:  { envVar: 'ANTHROPIC_API_KEY',  settingKey: 'anthropicApiKey',  label: 'Anthropic' },
  openai:     { envVar: 'OPENAI_API_KEY',     settingKey: 'openaiApiKey',     label: 'OpenAI' },
  google:     { envVar: 'GOOGLE_API_KEY',     settingKey: 'googleApiKey',     label: 'Google' },
  openrouter: { envVar: 'OPENROUTER_API_KEY', settingKey: 'openrouterApiKey', label: 'OpenRouter' },
};

function settingsPath() {
  return process.env.SETTINGS_PATH || path.join(__dirname, '../data/settings.json');
}

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); }
  catch { return {}; }
}

function writeSettings(settings) {
  const file = settingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2));
}

function providerKey(id, settings = readSettings()) {
  const cfg = PROVIDERS[id];
  if (!cfg) return '';
  return process.env[cfg.envVar] || settings[cfg.settingKey] || '';
}

// OpenRouter fronts hundreds of models, so the model id is part of its config
// rather than hard-coded the way the single-vendor providers are.
function openRouterModel(settings = readSettings()) {
  return settings.openrouterModel || process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
}

function getActiveProvider() {
  const settings = readSettings();
  const active = settings.aiProvider || 'anthropic';

  // Try active provider first, then fall back to any available
  const order = [active, ...Object.keys(PROVIDERS).filter(id => id !== active)];
  for (const id of order) {
    const key = providerKey(id, settings);
    if (key) {
      return { provider: id, key, model: id === 'openrouter' ? openRouterModel(settings) : null };
    }
  }
  return null;
}

module.exports = {
  PROVIDERS, DEFAULT_OPENROUTER_MODEL,
  readSettings, writeSettings, providerKey, openRouterModel, getActiveProvider,
};
