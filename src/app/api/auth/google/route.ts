import { NextRequest, NextResponse } from 'next/server';
import { db, UserRow } from '@/lib/db';
import { createSession, newUid, publicUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => ({}));
  const credential = String(data.credential || '');
  if (!credential)
    return NextResponse.json({ error: 'Missing credential' }, { status: 400 });

  let info: { email?: string; name?: string };
  try {
    const r = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!r.ok)
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    info = await r.json();
  } catch {
    return NextResponse.json({ error: 'Google verification failed' }, { status: 500 });
  }

  const email = (info.email || '').toLowerCase();
  const name = info.name || '';
  if (!email)
    return NextResponse.json({ error: 'No email in Google account' }, { status: 400 });

  const conn = db();
  const existing = conn
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as UserRow | undefined;

  if (existing) {
    const token = createSession(existing.id);
    return NextResponse.json({ token, user: publicUser(existing) });
  }

  const uid = newUid();
  const displayName = name || email.split('@')[0];
  const result = conn
    .prepare(
      'INSERT INTO users (email, password_hash, uid, display_name) VALUES (?, ?, ?, ?)'
    )
    .run(email, '', uid, displayName);
  const userId = Number(result.lastInsertRowid);
  const token = createSession(userId);

  return NextResponse.json({
    token,
    user: publicUser({
      id: userId,
      email,
      password_hash: '',
      uid,
      display_name: displayName,
      created_at: '',
    }),
  });
}
