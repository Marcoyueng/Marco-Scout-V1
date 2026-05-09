import { NextRequest, NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';
import { Match } from '@/types/robotevents';

export const runtime = 'nodejs';

const ROUND_NAMES: Record<number, string> = {
  1: 'P',
  2: 'Q',
  3: 'QF',
  4: 'SF',
  5: 'F',
  6: 'R16',
};

function matchName(round: number, instance: number, num: number): string {
  const prefix = ROUND_NAMES[round] || `R${round}`;
  if ([3, 4, 6].includes(round)) return `${prefix}${instance}-${num}`;
  return `${prefix}${num}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const eventId = parseInt(params.id);
  if (Number.isNaN(eventId))
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });

  let event: any;
  try {
    event = await robotevents.getEvent(eventId);
  } catch {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  const divisions: any[] = event?.divisions || [];

  // Aggregate matches + rankings across all divisions.
  const allMatches: any[] = [];
  let completed = 0;
  const allRankings: any[] = [];

  for (const div of divisions.length ? divisions : [{ id: 1, name: 'Main' }]) {
    const divId = div.id;
    const divName = div.name || `Division ${divId}`;

    let matches: Match[] = [];
    try {
      matches = await robotevents.getEventDivisionMatches(eventId, divId, {
        per_page: 250,
      });
    } catch {}

    for (const m of matches) {
      const redTeams = (m.alliance_red?.teams || []).map(
        (t: any) => t.team?.team || t.team?.name || ''
      );
      const blueTeams = (m.alliance_blue?.teams || []).map(
        (t: any) => t.team?.team || t.team?.name || ''
      );
      const round = m.round || 0;
      const inst = m.instance || 0;
      const num = m.match_num || 0;
      const scored = m.scored || (m.score_red || 0) + (m.score_blue || 0) > 0;
      if (scored) completed++;
      allMatches.push({
        division_id: divId,
        division_name: divName,
        name: m.name || matchName(round, inst, num),
        round,
        instance: inst,
        matchnum: num,
        red_score: m.score_red || 0,
        blue_score: m.score_blue || 0,
        red_teams: redTeams,
        blue_teams: blueTeams,
        scored,
        scheduled: m.scheduled,
      });
    }

    let rankings: any[] = [];
    try {
      rankings = await robotevents.getEventDivisionRankings(eventId, divId);
    } catch {}
    for (const r of rankings) {
      allRankings.push({
        division_id: divId,
        division_name: divName,
        rank: r.rank ?? 0,
        team_number: r.team?.name || '',
        wins: r.wins ?? 0,
        losses: r.losses ?? 0,
        ties: r.ties ?? 0,
        wp: r.wp ?? 0,
        ap: r.ap ?? 0,
        sp: r.sp ?? 0,
        high_score: r.high_score ?? 0,
      });
    }
  }

  return NextResponse.json({
    event_id: eventId,
    divisions: divisions.map((d: any) => ({ id: d.id, name: d.name })),
    matches: allMatches,
    match_progress: { completed, total: allMatches.length },
    rankings: allRankings,
  });
}
