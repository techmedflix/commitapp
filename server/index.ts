import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { assertDb } from './db.ts';
import { createApp } from './app.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const isProd = process.env.NODE_ENV === 'production';

async function main() {
  await assertDb();
  const app = createApp();

  // Single-process deploy (Railway/Render/VPS): serve Vite build + API together
  if (isProd) {
    const distDir = path.resolve(__dirname, '../dist');
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Commit ${isProd ? 'app' : 'API'} listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
