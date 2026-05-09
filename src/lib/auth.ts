// Bearer-token session auth, mirroring BALLBALL's `get_current_user` /
// `require_auth` behavior. Tokens are 64-hex random strings stored in the
// `sessions` table and sent via `Authorization: Bearer <token>`.

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, UserRow } from './db';

export function newToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function newUid(): string {
  // 8-char hex slice of a UUIDv4-equivalent — matches BALLBALL `uuid.uuid4()[:8]`.
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

export function getCurrentUser(req: NextRequest): UserRow | null {
  const auth = req.headers.get('authorization') || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ?`
    )
    .get(token) as UserRow | undefined;
  return row ?? null;
}

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.display_name,
    uid: user.uid,
  };
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Wrap a Next.js route handler so it requires a valid bearer token. The
 * authenticated `UserRow` is passed as the third argument.
 */
export function withAuth<C extends object>(
  handler: (req: NextRequest, ctx: C, user: UserRow) => Promise<Response> | Response
) {
  return async (req: NextRequest, ctx: C) => {
    const user = getCurrentUser(req);
    if (!user) return unauthorized();
    return handler(req, ctx, user);
  };
}

export function createSession(userId: number): string {
  const token = newToken();
  db()
    .prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)')
    .run(token, userId);
  return token;
}
