import { NextRequest, NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';
import { db } from '@/lib/db';
import { WORLDS_EVENT_ID } from '@/lib/worlds';

export const runtime = 'nodejs';

const ROUND_NAMES: Record<number, string> = {
  1: 'P', 2: 'Q', 3: 'QF', 4: 'SF', 5: 'F', 6: 'R16',
};

function matchName(round: number, instance: number, num: number) {
  const p = ROUND_NAMES[round] || `R${round}`;
  return [3, 4, 6].includes(round) ? `${p}${instance}-${num}` : `${p}${num}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const divName = decodeURIComponent(params.name);

  // Resolve division id from RE API.
  let divId: number | null = null;
  try {
    const ev: any = await robotevents.getEvent(WORLDS_EVENT_ID);
    const divs: any[] = ev?.divisions || [];
    for (const d of divs) {
      if ((d.name || '').toLowerCase() === divName.toLowerCase()) {
        divId = d.id;
        break;
      }
    }
    if (divId == null && divs.length) {
      // Fallback: index of name within sorted local division names.
      const localNames = (db()
        .prepare(
          'SELECT DISTINCT division_name FROM worlds_divisions ORDER BY division_name'
        )
        .all() as { division_name: string }[]).map((r) => r.division_name);
      const idx = localNames.indexOf(divName);
      if (idx >= 0 && idx < divs.length) divId = divs[idx].id;
    }
    if (divId == null && divs.length) divId = divs[0].id;
  } catch {
    divId = 1;
  }
  if (divId == null) divId = 1;

  let matches: any[] = [];
  let completed = 0;
  try {
    const raw = await robotevents.getEventDivisionMatches(
      WORLDS_EVENT_ID,
      divId,
      { per_page: 250 }
    );
    for (const m of raw) {
      const redTeams = (m.alliance_red?.teams || []).map(
        (t: any) => t.team?.team || t.team?.name || ''
      );
      const blueTeams = (m.alliance_blue?.teams || []).map(
        (t: any) => t.team?.team || t.team?.name || ''
      );
      const scored = m.scored || (m.score_red || 0) + (m.score_blue || 0) > 0;
      if (scored) completed++;
      matches.push({
        name:
          m.name ||
          matchName(m.round || 0, m.instance || 0, m.match_num || 0),
        round: m.round || 0,
        red_score: m.score_red || 0,
        blue_score: m.score_blue || 0,
        red_teams: redTeams,
        blue_teams: blueTeams,
        scored,
      });
    }
  } catch {}

  let rankings: any[] = [];
  try {
    const raw = await robotevents.getEventDivisionRankings(
      WORLDS_EVENT_ID,
      divId
    );
    rankings = raw.map((r: any) => ({
      rank: r.rank ?? 0,
      team_number: r.team?.name || '',
      wins: r.wins ?? 0,
      losses: r.losses ?? 0,
      ties: r.ties ?? 0,
      wp: r.wp ?? 0,
      ap: r.ap ?? 0,
      sp: r.sp ?? 0,
      high_score: r.high_score ?? 0,
    }));
  } catch {}

  return NextResponse.json({
    division_name: divName,
    division_id: divId,
    matches,
    match_progress: { completed, total: matches.length },
    rankings,
  });
}
