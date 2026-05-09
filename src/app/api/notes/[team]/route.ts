import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

type Ctx = { params: { team: string } };

export const GET = withAuth(async (_req: NextRequest, ctx: Ctx, user) => {
  const team = ctx.params.team;
  const row = db()
    .prepare(
      'SELECT note, updated_at FROM user_notes WHERE user_id = ? AND team_number = ?'
    )
    .get(user.id, team) as { note: string; updated_at: string } | undefined;
  return NextResponse.json({
    note: row?.note ?? '',
    updated_at: row?.updated_at ?? null,
  });
});

export const PUT = withAuth(async (req: NextRequest, ctx: Ctx, user) => {
  const team = ctx.params.team;
  const body = await req.json().catch(() => ({}));
  const noteText = String(body.note || '');
  const conn = db();
  if (noteText.trim()) {
    conn
      .prepare(
        `INSERT INTO user_notes (user_id, team_number, note, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, team_number)
         DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`
      )
      .run(user.id, team, noteText);
  } else {
    conn
      .prepare('DELETE FROM user_notes WHERE user_id = ? AND team_number = ?')
      .run(user.id, team);
  }
  return NextResponse.json({ ok: true });
});
