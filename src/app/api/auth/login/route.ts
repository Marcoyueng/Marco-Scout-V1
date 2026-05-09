import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db, UserRow } from '@/lib/db';
import { createSession, publicUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => ({}));
  const email = String(data.email || '').trim().toLowerCase();
  const password = String(data.password || '');

  const user = db()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as UserRow | undefined;
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = createSession(user.id);
  return NextResponse.json({ token, user: publicUser(user) });
}
