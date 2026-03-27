const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/notes', require('./routes/notes'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/doctrine-links', require('./routes/doctrines'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/resource-links', require('./routes/resourceLinks'));
app.use('/api/theme-chains', require('./routes/chains'));
app.use('/api/cross-refs', require('./routes/crossrefs'));
app.use('/api/export', require('./routes/backup').exportRouter);
app.use('/api/import', require('./routes/backup').importRouter);
app.use('/api/bible', require('./routes/bible'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api', require('./routes/utils'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend static files when running inside Electron
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});
