import { NextResponse } from 'next/server';
import { fetchSeasonSkillEntries, hydrateTeams } from '@/lib/robotevents/skills';
import {
  buildSkillsLeaderboard,
  computeFacets,
} from '@/utilities/skills-ranking';
import {
  CURRENT_V5RC_SEASON,
  findSeasonById,
} from '@/utilities/season-parser';

export const runtime = 'nodejs';

/**
 * Lightweight wrapper around the leaderboard pipeline that exposes only the
 * country facet. Kept for backwards compatibility with the original BALLBALL
 * console route shape.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const seasonId = parseInt(
      url.searchParams.get('season') || String(CURRENT_V5RC_SEASON.id)
    );
    const seasonInfo = findSeasonById(seasonId) || CURRENT_V5RC_SEASON;
    const program = url.searchParams.get('program') || seasonInfo.programCode;

    const entries = await fetchSeasonSkillEntries({
      seasonId,
      programCode: program,
      eventConcurrency: 4,
    });
    const uniqueIds = Array.from(new Set(entries.map((e) => e.team.id)));
    const hydrated = await hydrateTeams(uniqueIds, { concurrency: 4 });
    const lb = buildSkillsLeaderboard(entries, { hydratedTeams: hydrated });
    const { countries } = computeFacets(lb);
    return NextResponse.json(countries.map((c) => c.value));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
