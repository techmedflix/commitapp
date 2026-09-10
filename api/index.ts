import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/app.ts';
import { assertDb } from '../server/db.ts';

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
 * Static SPA assets are served by Vercel from `dist/`.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureDb();
  return app(req, res);
}
