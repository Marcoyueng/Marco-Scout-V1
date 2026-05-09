import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensurePredictedDivisions } from '@/lib/worlds';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const name = decodeURIComponent(params.name);
  await ensurePredictedDivisions().catch(() => {});

  const teams = db()
    .prepare(
      `SELECT team_number, division_name, is_predicted, division_id
       FROM worlds_divisions WHERE division_name = ?
       ORDER BY team_number COLLATE NOCASE ASC`
    )
    .all(name) as Array<{
    team_number: string;
    division_name: string;
    is_predicted: number;
    division_id: number;
  }>;

  return NextResponse.json({
    division_name: name,
    teams,
    stats: {
      total_teams: teams.length,
      is_predicted: teams.length > 0 ? !!teams[0].is_predicted : true,
    },
  });
}
