
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// Mount API router
app.use('/api/discord', require('./api/discord'));

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'index.html'));
});

// Quick debug route for deployed builds to check environment and package info
app.get('/api/debug', (req, res) => {
  const pkg = require('./package.json');
  res.json({
    ok: true,
    name: pkg.name,
    version: pkg.version,
    node: process.version,
    platform: process.platform,
    env: {
      client_id_set: Boolean(process.env.CLIENT_ID),
      client_secret_set: Boolean(process.env.CLIENT_SECRET),
      vercel_url: process.env.VERCEL_URL || null,
      vercel_env: process.env.VERCEL_ENV || null,
    }
  });
});

module.exports = app;

// Only listen when started directly (not in serverless environments)
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 50451;
  app.listen(PORT, () => {
    console.info(`Running on port ${PORT}`);
  });
}