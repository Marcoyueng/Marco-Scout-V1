import { NextRequest, NextResponse } from 'next/server';
import { db, UserRow } from '@/lib/db';
import { createSession, publicUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => ({}));
  const uid = String(data.uid || '').trim();
  if (!uid) return NextResponse.json({ error: 'UID required' }, { status: 400 });

  const user = db()
    .prepare('SELECT * FROM users WHERE uid = ?')
    .get(uid) as UserRow | undefined;
  if (!user) return NextResponse.json({ error: 'Invalid UID' }, { status: 401 });

  const token = createSession(user.id);
  return NextResponse.json({ token, user: publicUser(user) });
}
