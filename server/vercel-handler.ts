import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './app.ts';
import { assertDb } from './db.ts';

const app = createApp();

let dbReady: Promise<void> | null = null;

function ensureDb() {
  if (!dbReady) {
    dbReady = assertDb().catch((err) => {
      dbReady = null;
      throw err;
    });
  }
  return dbReady;
}

/**
 * Vercel serverless entry — Express handles `/api/*`.
 * Bundled to api/index.js at build time (see build:api).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureDb();
  return app(req, res);
}
