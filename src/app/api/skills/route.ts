import { NextRequest, NextResponse } from 'next/server';
import { getStale, putCache } from '@/lib/cache';
import {
  fetchSeasonSkillEntries,
  hydrateTeams,
  fullLeaderboardKey,
  FRESH_FULL_TTL_SECONDS,
} from '@/lib/robotevents/skills';
import {
  buildSkillsLeaderboard,
  applySkillsFilters,
  computeFacets,
  RankedTeamSkills,
} from '@/utilities/skills-ranking';
import {
  CURRENT_V5RC_SEASON,
  findSeasonById,
} from '@/utilities/season-parser';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * RobotEvents v2 has no global skills endpoint, so the only correct way to
 * reproduce official standings is to walk every event in a season. That's
 * minutes of upstream calls on a true cold start — too slow for a sync HTTP
 * request — so we use stale-while-revalidate semantics:
 *
 *   - If a full leaderboard is cached (fresh OR stale), return it now and
 *     kick off a background refresh in the background if it's stale.
 *   - If nothing is cached, build a "fast partial" leaderboard from only the
 *     N most-recent events synchronously (~30s), return it, then warm the
 *     full leaderboard in the background.
 *
 * Once the full leaderboard finishes building it overwrites the partial.
 */

interface LbEntry {
  /** unix ms */ at: number;
  /** kind of leaderboard: 'partial' or 'full' */ kind: 'partial' | 'full';
  /** age in seconds at which this entry should be considered stale */ ttl: number;
  data: RankedTeamSkills[];
}

const fullKey = fullLeaderboardKey;
const FRESH_FULL_TTL = FRESH_FULL_TTL_SECONDS;
const FRESH_PARTIAL_TTL = 60 * 5; // 5 minutes — encourages quick upgrade to full
// Cold-start budget — keep this tiny so first paint is <10s. Subsequent
// requests hit the cached partial (instant) while warmFull replaces it in the
// background with the complete season leaderboard.
const PARTIAL_EVENT_LIMIT = 8;
const PARTIAL_HYDRATE_TOP = 0; // skip hydration on cold path; warmFull does it

const inflightFull = new Map<string, Promise<RankedTeamSkills[]>>();

async function buildLeaderboard(
  seasonId: number,
  programCode: string,
  opts: { recentLimit?: number; hydrate?: boolean | number } = {}
): Promise<RankedTeamSkills[]> {
  const entries = await fetchSeasonSkillEntries({
    seasonId,
    programCode,
    eventConcurrency: 4,
    recentEventLimit: opts.recentLimit,
  });
  // Build the leaderboard without hydration first so we know team rank order.
  const naive = buildSkillsLeaderboard(entries, { hydratedTeams: new Map() });
  const hydrate = opts.hydrate ?? true;
  if (hydrate === false) return naive;
  // Hydrate only the top-N teams when a number is passed (fast partial path)
  // or every team when `true` is passed (full warm path).
  const topN = typeof hydrate === 'number' ? hydrate : naive.length;
  const idsToHydrate = naive.slice(0, topN).map((r) => r.team.id);
  const hydrated = await hydrateTeams(idsToHydrate, { concurrency: 6 });
  // Rebuild with hydrated metadata for the teams we know about.
  return buildSkillsLeaderboard(entries, { hydratedTeams: hydrated });
}

function warmFull(seasonId: number, programCode: string) {
  const key = fullKey(seasonId, programCode);
  if (inflightFull.has(key)) return inflightFull.get(key)!;
  const p = (async () => {
    try {
      const full = await buildLeaderboard(seasonId, programCode);
      putCache<LbEntry>(key, FRESH_FULL_TTL, {
        at: Date.now(),
        kind: 'full',
        ttl: FRESH_FULL_TTL,
        data: full,
      });
      return full;
    } finally {
      inflightFull.delete(key);
    }
  })();
  inflightFull.set(key, p);
  return p;
}

async function loadLeaderboard(
  seasonId: number,
  programCode: string,
  force: boolean
): Promise<{ rows: RankedTeamSkills[]; meta: { kind: 'partial' | 'full'; cached_at: string; stale: boolean } }> {
  const key = fullKey(seasonId, programCode);
  const now = Date.now();

  if (!force) {
    const stale = getStale<LbEntry>(key);
    if (stale) {
      const ageMs = now - stale.at;
      const isStale = ageMs > stale.ttl * 1000;
      // We deliberately do NOT auto-trigger warmFull here. Background warming
      // walks ~600 events and saturates the RobotEvents rate-limit budget,
      // which causes /teams and /events to hang. Users get a manual refresh
      // (force=1) for the full leaderboard when they want it.
      return {
        rows: stale.data,
        meta: {
          kind: stale.kind,
          cached_at: new Date(stale.at).toISOString(),
          stale: isStale,
        },
      };
    }
  }

  // True cold (or forced): build a tiny no-hydration partial synchronously
  // (~2-5s) and return it. Then start the full warm in the background — it
  // does its own hydration and overwrites the cache when done.
  const partial = await buildLeaderboard(seasonId, programCode, {
    recentLimit: PARTIAL_EVENT_LIMIT,
    hydrate: PARTIAL_HYDRATE_TOP,
  });
  putCache<LbEntry>(key, FRESH_PARTIAL_TTL, {
    at: Date.now(),
    kind: 'partial',
    ttl: FRESH_PARTIAL_TTL,
    data: partial,
  });
  // Note: we no longer auto-kick warmFull here. It hammers the RobotEvents API
  // and starves /teams /events of upstream slots. The /skills page exposes a
  // manual "Refresh" action that calls /api/skills?force=1 explicitly.
  return {
    rows: partial,
    meta: {
      kind: 'partial',
      cached_at: new Date().toISOString(),
      stale: false,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const seasonId = parseInt(
      url.searchParams.get('season') || String(CURRENT_V5RC_SEASON.id)
    );
    const seasonInfo = findSeasonById(seasonId) || CURRENT_V5RC_SEASON;
    const program = url.searchParams.get('program') || seasonInfo.programCode;

    const filters = {
      search: url.searchParams.get('q') || undefined,
      grade: url.searchParams.get('grade') || undefined,
      country: url.searchParams.get('country') || undefined,
      region: url.searchParams.get('region') || undefined,
      program: url.searchParams.get('teamProgram') || undefined,
    };

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const perPage = Math.min(
      250,
      Math.max(1, parseInt(url.searchParams.get('per_page') || '50'))
    );

    const force = url.searchParams.get('force') === '1';
    const { rows: all, meta } = await loadLeaderboard(seasonId, program, force);
    const filtered = applySkillsFilters(all, filters);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const slice = filtered.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({
      season: { ...seasonInfo, id: seasonId },
      program,
      rows: slice,
      facets: computeFacets(all),
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
      total_in_season: all.length,
      cache: meta,
    });
  } catch (error) {
    console.error('Skills API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to compute skills standings',
        message: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
