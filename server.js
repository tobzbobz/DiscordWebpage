
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// Mount API router
app.use('/api/discord', require('./api/discord'));

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'index.html'));
});

module.exports = app;

// Only listen when started directly (not in serverless environments)
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 50451;
  app.listen(PORT, () => {
    console.info(`Running on port ${PORT}`);
  });
}