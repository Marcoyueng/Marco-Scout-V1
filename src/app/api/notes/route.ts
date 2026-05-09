import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, _ctx: object, user) => {
  const rows = db()
    .prepare(
      `SELECT team_number, note, updated_at
       FROM user_notes
       WHERE user_id = ?
       ORDER BY updated_at DESC`
    )
    .all(user.id);
  return NextResponse.json({ notes: rows });
});
