import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, newUid } from '@/lib/auth';

export const runtime = 'nodejs';

export const POST = withAuth(async (_req: NextRequest, _ctx: object, user) => {
  const conn = db();
  const count = (conn
    .prepare(
      `SELECT COUNT(*) as c FROM uid_resets
       WHERE user_id = ? AND reset_at >= datetime('now', '-1 day')`
    )
    .get(user.id) as { c: number }).c;
  if (count >= 3) {
    return NextResponse.json(
      { error: 'Daily reset limit reached (3/day)' },
      { status: 429 }
    );
  }

  const uid = newUid();
  conn.prepare('UPDATE users SET uid = ? WHERE id = ?').run(uid, user.id);
  conn.prepare('INSERT INTO uid_resets (user_id) VALUES (?)').run(user.id);

  return NextResponse.json({ ok: true, uid, resets_remaining: 2 - count });
});
