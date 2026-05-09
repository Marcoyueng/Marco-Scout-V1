// Aggregate raw skills entries into the official RobotEvents standings.
//
// Rules — matching robotevents.com/.../standings/skills as closely as the
// public v2 API allows:
//   1. Within a team, take the BEST driver score across all attempts.
//   2. Within a team, take the BEST programming score across all attempts.
//   3. Total = best_driver + best_programming.
//   4. Sort descending by total. Tiebreakers in order:
//        a. Higher driver score
//        b. Higher programming score
//        c. Earlier "completion" event date — the LATER of the two best-score
//           events, since that's when the team finalized their combined total.
//           Earlier finalization wins ties (matches RE convention of awarding
//           ties to whoever achieved the score first).
//        d. Lexicographic (numeric-aware) team number — deterministic last
//           resort for fully tied teams.
//   5. Programs are NEVER mixed (V5RC vs VURC vs VIQRC live in separate
//      seasons; caller is expected to scope by season+program upstream).
//
// NOTE: The RobotEvents v2 API does NOT expose per-attempt timestamps. We use
// the parent event's `end` date (falling back to `start`) as the closest
// available proxy. This means same-event ties cannot be split further than the
// numeric team-number tiebreak.

import { RawSkillEntry } from '@/lib/robotevents/skills';

export interface RankedTeamSkills {
  rank: number;
  team: {
    id: number;
    number: string;
    name: string;
    organization: string;
    grade: string;
    location: { city: string; region: string; country: string };
    program: string;
  };
  totalScore: number;
  driverScore: number;
  programmingScore: number;
  /** The event the team's BEST driver score came from. */
  driverEvent: { id: number; name: string; date: string | null } | null;
  programmingEvent: { id: number; name: string; date: string | null } | null;
  /** Number of skills attempts this team has logged in the season. */
  attempts: number;
}

export interface BuildLeaderboardOptions {
  hydratedTeams?: Map<number, any>;
}

interface TeamAcc {
  best: { driver?: RawSkillEntry; programming?: RawSkillEntry };
  attempts: number;
}

/**
 * Reduce a flat list of attempts into best-per-team buckets.
 */
function groupByTeam(entries: RawSkillEntry[]): Map<number, TeamAcc> {
  const map = new Map<number, TeamAcc>();
  for (const e of entries) {
    const id = e.team?.id;
    if (!id) continue;
    let acc = map.get(id);
    if (!acc) {
      acc = { best: {}, attempts: 0 };
      map.set(id, acc);
    }
    acc.attempts += e.attempts || 1;
    const cur = acc.best[e.type];
    if (!cur || e.score > cur.score) {
      acc.best[e.type] = e;
    }
  }
  return map;
}

function programCode(p: any): string {
  if (!p) return '';
  if (typeof p === 'string') return p;
  return p.code || '';
}

/**
 * Build the official-style ranked leaderboard.
 */
export function buildSkillsLeaderboard(
  entries: RawSkillEntry[],
  opts: BuildLeaderboardOptions = {}
): RankedTeamSkills[] {
  const grouped = groupByTeam(entries);
  const hydrated = opts.hydratedTeams || new Map();

  const rows: RankedTeamSkills[] = [];
  grouped.forEach((acc, teamId) => {
    const driver = acc.best.driver;
    const prog = acc.best.programming;
    if (!driver && !prog) return;
    const dScore = driver?.score ?? 0;
    const pScore = prog?.score ?? 0;
    const total = dScore + pScore;
    if (total <= 0) return;

    // Prefer hydrated team metadata over the partial team object embedded in
    // the skills entry.
    const reference = driver?.team || prog?.team || ({} as any);
    const hydratedTeam = hydrated.get(teamId);
    const teamNumber: string =
      hydratedTeam?.number || reference.name || reference.team || '';
    const teamName: string =
      hydratedTeam?.team_name || reference.team_name || teamNumber;
    const organization: string =
      hydratedTeam?.organization || reference.organization || '';
    const grade: string = hydratedTeam?.grade || reference.grade || '';
    const location = {
      city:
        hydratedTeam?.location?.city ?? reference.location?.city ?? '',
      region:
        hydratedTeam?.location?.region ?? reference.location?.region ?? '',
      country:
        hydratedTeam?.location?.country ?? reference.location?.country ?? '',
    };
    const program: string = programCode(hydratedTeam?.program ?? reference.program);

    const driverDate = driver ? eventDate(driver) : null;
    const progDate = prog ? eventDate(prog) : null;

    rows.push({
      rank: 0, // set after sort
      team: {
        id: teamId,
        number: teamNumber,
        name: teamName,
        organization,
        grade,
        location,
        program,
      },
      totalScore: total,
      driverScore: dScore,
      programmingScore: pScore,
      driverEvent: driver
        ? { id: driver.event.id, name: driver.event.name, date: driverDate }
        : null,
      programmingEvent: prog
        ? { id: prog.event.id, name: prog.event.name, date: progDate }
        : null,
      attempts: acc.attempts,
    });
  });

  rows.sort(rankCompare);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

function eventDate(e: RawSkillEntry): string | null {
  return (e.event?.end || e.event?.start || '').slice(0, 10) || null;
}

function rankCompare(a: RankedTeamSkills, b: RankedTeamSkills): number {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  if (b.driverScore !== a.driverScore) return b.driverScore - a.driverScore;
  if (b.programmingScore !== a.programmingScore)
    return b.programmingScore - a.programmingScore;
  // Earlier "completion" event date — the later of the two event dates is when
  // the team locked in the combo. Team that finalized earlier wins the tie.
  const aDone = latestEventDate(a);
  const bDone = latestEventDate(b);
  if (aDone && bDone && aDone !== bDone) return aDone < bDone ? -1 : 1;
  return a.team.number.localeCompare(b.team.number, undefined, { numeric: true });
}

function latestEventDate(r: RankedTeamSkills): string | null {
  const a = r.driverEvent?.date || null;
  const b = r.programmingEvent?.date || null;
  if (a && b) return a > b ? a : b;
  return a || b || null;
}

export interface SkillsFilters {
  search?: string;
  grade?: string;
  country?: string;
  region?: string; // RobotEvents `region` (state/province).
  program?: string;
}

const norm = (v?: string | null) => (v ?? '').toLowerCase().trim();

export function applySkillsFilters(
  rows: RankedTeamSkills[],
  filters: SkillsFilters
): RankedTeamSkills[] {
  const s = norm(filters.search);
  const g = norm(filters.grade);
  const c = norm(filters.country);
  const r = norm(filters.region);
  const p = norm(filters.program);

  return rows.filter((row) => {
    if (g && norm(row.team.grade) !== g) return false;
    if (c && norm(row.team.location.country) !== c) return false;
    if (r && norm(row.team.location.region) !== r) return false;
    if (p && norm(row.team.program) !== p) return false;
    if (s) {
      const hay = [
        row.team.number,
        row.team.name,
        row.team.organization,
        row.team.location.city,
        row.team.location.region,
        row.team.location.country,
      ]
        .filter(Boolean)
        .map(norm)
        .join(' | ');
      if (!hay.includes(s)) return false;
    }
    return true;
  });
}

export interface FacetCounts {
  grades: { value: string; count: number }[];
  countries: { value: string; count: number }[];
  regions: { value: string; count: number }[];
}

/** Compute facet counts from a (filtered or unfiltered) leaderboard. */
export function computeFacets(rows: RankedTeamSkills[]): FacetCounts {
  const tally = (key: (r: RankedTeamSkills) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = (key(r) || '').trim();
      if (!v) continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) =>
        b.count - a.count || a.value.localeCompare(b.value)
      );
  };
  return {
    grades: tally((r) => r.team.grade),
    countries: tally((r) => r.team.location.country),
    regions: tally((r) => r.team.location.region),
  };
}
