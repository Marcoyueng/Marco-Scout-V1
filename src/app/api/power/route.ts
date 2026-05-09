import { NextRequest, NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';
import { cached } from '@/lib/cache';
import { calcPowerRating } from '@/lib/powerRating';
import { CURRENT_SEASON, WORLDS_EVENT } from '@/lib/constants';

export const revalidate = 21600; // 6h

interface TeamPower {
  rank: number;
  team: {
    id: number;
    number: string;
    name: string;
    organization: string;
    location: string;
  };
  rating: number;
  driverSkills: number;
  programmingSkills: number;
  combinedSkills: number;
  wins: number;
  losses: number;
  ties: number;
  events: number;
}

async function pLimit<T>(items: T[], limit: number, fn: (x: T) => Promise<any>) {
  const results: any[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i]);
      } catch {
        results[i] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 250);

  try {
    // Always compute the same pool size so all callers share one cache entry.
    const POOL_SIZE = 60;
    const all = await cached(`power:v4-pushback:pool=${POOL_SIZE}`, 21600, async () => {
      // Use Worlds-registered teams as the elite pool.
      const worldsTeams = await robotevents.getEventTeams(WORLDS_EVENT.id, { per_page: 250 });
      const pool = worldsTeams.data.slice(0, POOL_SIZE);

      const enriched = await pLimit(pool, 3, async (team) => {
        const [skillsResp, matchesResp, eventsResp] = await Promise.all([
          robotevents
            .getTeamSkills(team.id, { season: CURRENT_SEASON.id, per_page: 100 })
            .catch(() => ({ data: [] as any[], pagination: { total: 0 } as any })),
          robotevents
            .getTeamMatches(team.id, { season: CURRENT_SEASON.id, per_page: 100 })
            .catch(() => ({ data: [] as any[], pagination: { total: 0 } as any })),
          robotevents
            .getTeamEvents(team.id, { season: CURRENT_SEASON.id, per_page: 50 })
            .catch(() => ({ data: [] as any[], pagination: { total: 0 } as any })),
        ]);

        const skills = (skillsResp as any).data || [];
        const matches = (matchesResp as any).data || [];
        const events = (eventsResp as any).data || [];

        const driver = Math.max(0, ...skills.filter((s: any) => s.type === 'driver').map((s: any) => s.score || 0));
        const prog = Math.max(0, ...skills.filter((s: any) => s.type === 'programming').map((s: any) => s.score || 0));

        let wins = 0;
        let losses = 0;
        let ties = 0;
        matches.forEach((m: any) => {
          const onRed = (m.alliance_red?.teams || []).some((t: any) => t.team?.id === team.id);
          const my = onRed ? m.score_red : m.score_blue;
          const op = onRed ? m.score_blue : m.score_red;
          if (my > op) wins++;
          else if (my < op) losses++;
          else ties++;
        });

        const rating = calcPowerRating({
          driverSkills: isFinite(driver) ? driver : 0,
          programmingSkills: isFinite(prog) ? prog : 0,
          totalMatches: matches.length,
          wins,
          ties,
          eventCount: events.length,
        });

        return {
          team,
          rating,
          driver: isFinite(driver) ? driver : 0,
          prog: isFinite(prog) ? prog : 0,
          wins,
          losses,
          ties,
          events: events.length,
        };
      });

      const ranked: TeamPower[] = enriched
        .filter(Boolean)
        .sort((a: any, b: any) => b.rating - a.rating)
        .map((row: any, i: number) => ({
          rank: i + 1,
          team: {
            id: row.team.id,
            number: row.team.team || row.team.number,
            name: row.team.name || row.team.team_name || '',
            organization: row.team.organization || '',
            location: [row.team.location?.city, row.team.location?.region, row.team.location?.country]
              .filter(Boolean)
              .join(', '),
          },
          rating: row.rating,
          driverSkills: row.driver,
          programmingSkills: row.prog,
          combinedSkills: row.driver + row.prog,
          wins: row.wins,
          losses: row.losses,
          ties: row.ties,
          events: row.events,
        }));

      return { teams: ranked, season: CURRENT_SEASON, source: WORLDS_EVENT };
    });

    return NextResponse.json({ ...all, teams: all.teams.slice(0, limit) });
  } catch (error) {
    console.error('power error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load power rankings' },
      { status: 500 }
    );
  }
}
