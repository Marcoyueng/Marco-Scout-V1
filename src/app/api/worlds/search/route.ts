import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensurePredictedDivisions } from '@/lib/worlds';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().toUpperCase();
  if (!q) return NextResponse.json({ error: 'No query' }, { status: 400 });

  await ensurePredictedDivisions().catch(() => {});

  const row = db()
    .prepare(
      `SELECT division_name, team_number, is_predicted
       FROM worlds_divisions WHERE UPPER(team_number) = ?`
    )
    .get(q) as
    | { division_name: string; team_number: string; is_predicted: number }
    | undefined;

  if (!row) return NextResponse.json({ found: false });

  const teammates = db()
    .prepare(
      `SELECT team_number FROM worlds_divisions
       WHERE division_name = ? ORDER BY team_number ASC LIMIT 50`
    )
    .all(row.division_name) as { team_number: string }[];

  const total = (db()
    .prepare('SELECT COUNT(*) as c FROM worlds_divisions WHERE division_name = ?')
    .get(row.division_name) as { c: number }).c;

  return NextResponse.json({
    found: true,
    team: row,
    division_name: row.division_name,
    is_predicted: !!row.is_predicted,
    top_teams: teammates,
    division_stats: { total },
  });
}
