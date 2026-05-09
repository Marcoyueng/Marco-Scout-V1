// Skills aggregation pipeline.
//
// RobotEvents v2 has NO global skills endpoint — verified empirically. The
// only public way to reproduce official standings is to:
//   1. List every event in the season for a given program (V5RC, VURC, ...)
//   2. For each completed/in-progress event, fetch /events/{id}/skills
//   3. Aggregate per team: best driver, best programming, sum, timestamps.
//
// Step 1 + 2 is expensive on first run. We rely on the underlying
// fetchWithRetry URL cache (TTLs in robotevents.ts) so subsequent runs hit
// hot cache. The aggregated leaderboard is itself cached in `lib/cache.ts`
// for several hours.

import { robotevents } from '@/lib/robotevents';
import { paginate } from './pagination';
import { cached } from '@/lib/cache';

/**
 * Cache key + TTL for the aggregated season leaderboard. Defined here so the
 * /api/skills route AND any offline warming script (scripts/warm-skills.ts)
 * write to the same disk cache entry.
 */
export const fullLeaderboardKey = (seasonId: number, programCode: string) =>
  `skills:lb:full:v4:${seasonId}:${programCode}`;
export const FRESH_FULL_TTL_SECONDS = 60 * 60 * 6; // 6 hours

export interface RawSkillEntry {
  id: number;
  type: 'driver' | 'programming';
  season: { id: number; name: string };
  /**
   * Augmented at fetch time with `start` / `end` from the parent event so that
   * downstream ranking code has a date proxy for tiebreaking. The v2 API does
   * NOT expose per-attempt timestamps.
   */
  event: {
    id: number;
    name: string;
    code?: string;
    start?: string;
    end?: string;
  };
  team: {
    id: number;
    name: string; // team number, confusingly
    team_name?: string; // human-readable name
    organization?: string;
    grade?: string;
    location?: { city?: string; region?: string; country?: string };
    program?: string | { id: number; code: string; name: string };
  };
  division?: { id: number; name: string } | null;
  rank: number;
  score: number;
  attempts: number;
}

export interface RawV2Event {
  id: number;
  sku?: string;
  name: string;
  start: string;
  end: string;
  awards_finalized?: boolean;
  program?: { id: number; code: string; name: string };
  level?: string;
  location?: { city?: string; region?: string; country?: string };
}

export interface SeasonEventsOptions {
  seasonId: number;
  programCode?: string; // 'V5RC', 'VURC', ...
  /** YYYY-MM-DD; only events that ended on or before this are kept. */
  endedOnOrBefore?: string;
  /** Hard cap on event count. Defaults to 5000. */
  maxEvents?: number;
}

/**
 * List every event in a season, optionally filtered to a program and to events
 * that have already ended. We pre-filter post-fetch because the v2 events
 * endpoint does not honor every combination reliably.
 */
export async function listSeasonEvents(
  opts: SeasonEventsOptions
): Promise<RawV2Event[]> {
  const cacheKey = `skills-events:v1:${opts.seasonId}:${opts.programCode || 'ALL'}:${
    opts.endedOnOrBefore || 'all'
  }`;
  return cached(cacheKey, 3600, async () => {
    const today = opts.endedOnOrBefore || new Date().toISOString().slice(0, 10);
    const events = await paginate<RawV2Event>({
      path: `seasons/${opts.seasonId}/events`,
      perPage: 250,
      maxPages: Math.ceil((opts.maxEvents ?? 5000) / 250),
      stopWhen: (acc, _meta) => acc.length >= (opts.maxEvents ?? 5000),
    });
    return events.filter((e) => {
      if (opts.programCode && e.program?.code && e.program.code !== opts.programCode)
        return false;
      const end = (e.end || e.start || '').slice(0, 10);
      if (!end) return false;
      return end <= today;
    });
  });
}

export interface FetchSeasonSkillsOptions extends SeasonEventsOptions {
  /** Concurrency for per-event skill fetches. Defaults to 4. */
  eventConcurrency?: number;
  /** Optional progress callback: (done, total). */
  onProgress?: (done: number, total: number) => void;
  /**
   * If set, only fetch skills for the N most-recent events (by `end` date desc).
   * Used for "fast partial" cold-start responses while a full warm runs in the
   * background.
   */
  recentEventLimit?: number;
}

/**
 * Fetch every skills attempt across the season. Returns the flat list of
 * raw entries — aggregation is done elsewhere.
 */
export async function fetchSeasonSkillEntries(
  opts: FetchSeasonSkillsOptions
): Promise<RawSkillEntry[]> {
  let events = await listSeasonEvents(opts);
  // Sort newest-first so a `recentEventLimit` slice covers the most relevant
  // (i.e., most recent) skills runs.
  events = events
    .slice()
    .sort((a, b) => (b.end || b.start || '').localeCompare(a.end || a.start || ''));
  if (opts.recentEventLimit && events.length > opts.recentEventLimit) {
    events = events.slice(0, opts.recentEventLimit);
  }

  const cacheKey = `skills-entries:v2:${opts.seasonId}:${opts.programCode || 'ALL'}:${
    opts.endedOnOrBefore || 'all'
  }:n=${events.length}:lim=${opts.recentEventLimit || 'all'}`;

  return cached(cacheKey, 1800, async () => {
    const out: RawSkillEntry[] = [];
    const conc = opts.eventConcurrency ?? 4;
    let next = 0;
    let done = 0;

    async function worker() {
      while (next < events.length) {
        const i = next++;
        const ev = events[i];
        try {
          // Walk every page of this event's skills feed.
          const entries = await paginate<RawSkillEntry>({
            path: `events/${ev.id}/skills`,
            perPage: 250,
            maxPages: 4,
          });
          // Drop entries that don't include a usable team or score.
          for (const e of entries) {
            if (!e?.team?.id || !e?.team?.name) continue;
            if (typeof e.score !== 'number' || e.score < 0) continue;
            if (e.type !== 'driver' && e.type !== 'programming') continue;
            // Stamp the event's known dates onto the entry's event field so
            // downstream code can use them for tie-breaking.
            (e.event as any) = {
              id: ev.id,
              name: ev.name,
              code: ev.sku,
              start: ev.start,
              end: ev.end,
            };
            out.push(e);
          }
        } catch {
          /* skip event on error — stale cache will fall back next time */
        } finally {
          done++;
          opts.onProgress?.(done, events.length);
        }
      }
    }

    await Promise.all(Array.from({ length: conc }, () => worker()));
    return out;
  });
}

/**
 * Hydrate full team metadata (grade, location, organization) for a given set
 * of team ids. Uses the URL-level cache so repeated calls are cheap.
 */
export async function hydrateTeams(
  teamIds: number[],
  opts: { concurrency?: number } = {}
): Promise<Map<number, {
  id: number;
  number: string;
  team_name?: string;
  organization?: string;
  grade?: string;
  location?: { city?: string; region?: string; country?: string };
  program?: { id: number; code: string; name: string } | string;
}>> {
  const conc = opts.concurrency ?? 4;
  const out = new Map<number, any>();
  let next = 0;
  async function worker() {
    while (next < teamIds.length) {
      const i = next++;
      const id = teamIds[i];
      if (!id) continue;
      try {
        const t = await robotevents.raw<any>(`teams/${id}`);
        out.set(id, {
          id,
          number: t.number || t.team || '',
          team_name: t.team_name || t.name || '',
          organization: t.organization || '',
          grade: t.grade || '',
          location: t.location || {},
          program: t.program,
        });
      } catch {
        /* leave team unhydrated; downstream code shows what we have */
      }
    }
  }
  await Promise.all(Array.from({ length: conc }, () => worker()));
  return out;
}
