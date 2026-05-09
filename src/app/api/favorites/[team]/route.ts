import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

type Ctx = { params: { team: string } };

export const GET = withAuth(async (_req: NextRequest, ctx: Ctx, user) => {
  const team = ctx.params.team;
  const row = db()
    .prepare('SELECT 1 as one FROM user_favorites WHERE user_id = ? AND team_number = ?')
    .get(user.id, team);
  return NextResponse.json({ is_favorite: !!row });
});

export const POST = withAuth(async (_req: NextRequest, ctx: Ctx, user) => {
  const team = ctx.params.team;
  const conn = db();
  const existing = conn
    .prepare('SELECT 1 as one FROM user_favorites WHERE user_id = ? AND team_number = ?')
    .get(user.id, team);
  let isFav: boolean;
  if (existing) {
    conn
      .prepare('DELETE FROM user_favorites WHERE user_id = ? AND team_number = ?')
      .run(user.id, team);
    isFav = false;
  } else {
    conn
      .prepare('INSERT INTO user_favorites (user_id, team_number) VALUES (?, ?)')
      .run(user.id, team);
    isFav = true;
  }
  return NextResponse.json({ is_favorite: isFav });
});
