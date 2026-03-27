const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.get('/fetch-title', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('http')) return res.status(400).json({ error: 'Invalid URL' });
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibleNotebook/1.0)' },
      timeout: 8000,
    });
    const text = await response.text();
    const match = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match && match[1]) {
      const title = match[1].trim()
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      return res.json({ title });
    }
    res.json({ title: null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// AI placeholders (501 Not Implemented)
router.post('/ai/summarize', (req, res) => res.status(501).json({ error: 'AI features not yet implemented' }));
router.post('/ai/suggest-tags', (req, res) => res.status(501).json({ error: 'AI features not yet implemented' }));
router.post('/ai/cross-refs', (req, res) => res.status(501).json({ error: 'AI features not yet implemented' }));

module.exports = router;
