import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, newUid, publicUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => ({}));
  const email = String(data.email || '').trim().toLowerCase();
  const password = String(data.password || '');
  const name = String(data.name || '').trim();
  const code = String(data.code || '').trim();

  if (!email || !email.includes('@'))
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    );
  if (!code)
    return NextResponse.json({ error: 'Verification code required' }, { status: 400 });

  const conn = db();
  const codeRow = conn
    .prepare(
      `SELECT id FROM email_verify_codes
       WHERE email = ? AND code = ? AND used = 0
         AND created_at >= datetime('now', '-10 minutes')`
    )
    .get(email, code) as { id: number } | undefined;
  if (!codeRow)
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });

  const existing = conn.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing)
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

  conn.prepare('UPDATE email_verify_codes SET used = 1 WHERE id = ?').run(codeRow.id);

  const uid = newUid();
  const pwHash = bcrypt.hashSync(password, 10);
  const displayName = name || email.split('@')[0];
  const result = conn
    .prepare(
      'INSERT INTO users (email, password_hash, uid, display_name) VALUES (?, ?, ?, ?)'
    )
    .run(email, pwHash, uid, displayName);
  const userId = Number(result.lastInsertRowid);
  const token = createSession(userId);

  return NextResponse.json({
    token,
    user: publicUser({
      id: userId,
      email,
      password_hash: pwHash,
      uid,
      display_name: displayName,
      created_at: '',
    }),
  });
}
