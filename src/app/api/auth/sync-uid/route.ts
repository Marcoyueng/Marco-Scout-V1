import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, _ctx: object, user) => {
  const data = await req.json().catch(() => ({}));
  const uid = String(data.uid || '').trim();
  if (!uid) return NextResponse.json({ error: 'UID required' }, { status: 400 });

  const source = db()
    .prepare('SELECT id FROM users WHERE uid = ?')
    .get(uid) as { id: number } | undefined;
  if (!source) return NextResponse.json({ error: 'Invalid UID' }, { status: 404 });
  if (source.id === user.id)
    return NextResponse.json({ error: 'Cannot sync with yourself' }, { status: 400 });

  const conn = db();
  conn
    .prepare(
      `INSERT OR IGNORE INTO user_notes (user_id, team_number, note, updated_at)
       SELECT ?, team_number, note, updated_at FROM user_notes WHERE user_id = ?`
    )
    .run(user.id, source.id);
  conn
    .prepare(
      `INSERT OR IGNORE INTO user_favorites (user_id, team_number, created_at)
       SELECT ?, team_number, created_at FROM user_favorites WHERE user_id = ?`
    )
    .run(user.id, source.id);

  const totalNotes = (conn
    .prepare('SELECT COUNT(*) as c FROM user_notes WHERE user_id = ?')
    .get(user.id) as { c: number }).c;
  const totalFavs = (conn
    .prepare('SELECT COUNT(*) as c FROM user_favorites WHERE user_id = ?')
    .get(user.id) as { c: number }).c;

  return NextResponse.json({ ok: true, total_notes: totalNotes, total_favorites: totalFavs });
});
