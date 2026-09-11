import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'commit-dev-secret-change-me';
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  '';

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export const ALLOWED_GOOGLE_DOMAIN = 'medflix.app';

export function isAllowedGoogleEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return domain === ALLOWED_GOOGLE_DOMAIN;
}

export type AuthUser = { id: string; email: string };

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function verifyGoogleIdToken(credential: string) {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error('Invalid Google token');
  }
  const email = payload.email.toLowerCase();
  if (!isAllowedGoogleEmail(email) || (payload.hd && payload.hd !== ALLOWED_GOOGLE_DOMAIN)) {
    throw new Error(`Sign-in is restricted to @${ALLOWED_GOOGLE_DOMAIN} Google accounts`);
  }
  return {
    email,
    name: payload.name || payload.given_name || 'Google User',
    picture: payload.picture as string | undefined,
    sub: payload.sub as string,
  };
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  req.user = user;
  next();
}
