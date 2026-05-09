/* eslint-disable no-console */
// Env vars are loaded via `node --env-file=.env.local` in the npm script.

/**
 * Offline warming script for the season skills leaderboard.
 *
 * Walks every event in the requested season(s), fetches all skills runs,
 * hydrates every team, builds the official-style leaderboard, and writes the
 * result into the same disk cache that `/api/skills` reads from.
 *
 * Run this from a separate terminal — it shares the RobotEvents API token
 * with the dev server, so prefer running it when the site is idle.
 *
 *   npm run warm:skills              # warms the current V5RC season (197)
 *   npm run warm:skills -- --season=190
 *   npm run warm:skills -- --season=197 --program=V5RC
 *   npm run warm:skills -- --all     # walks every season in season-parser
 */

import {
  fetchSeasonSkillEntries,
  hydrateTeams,
  fullLeaderboardKey,
  FRESH_FULL_TTL_SECONDS,
} from '@/lib/robotevents/skills';
import { buildSkillsLeaderboard } from '@/utilities/skills-ranking';
import { putCache } from '@/lib/cache';
import { CURRENT_V5RC_SEASON, KNOWN_SEASONS, findSeasonById } from '@/utilities/season-parser';

interface CliArgs {
  season?: number;
  program?: string;
  all?: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {};
  for (const raw of argv.slice(2)) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(raw);
    if (!m) continue;
    const [, key, val] = m;
    if (key === 'season') out.season = parseInt(val);
    else if (key === 'program') out.program = val;
    else if (key === 'all') out.all = true;
  }
  return out;
}

function fmt(t: number) {
  return `${(t / 1000).toFixed(1)}s`;
}

async function warmOne(seasonId: number, programCode: string) {
  const start = Date.now();
  console.log(`\n=== Warming season ${seasonId} (${programCode}) ===`);

  console.log('1/3  Walking events + fetching all skills entries…');
  const t0 = Date.now();
  const entries = await fetchSeasonSkillEntries({
    seasonId,
    programCode,
    eventConcurrency: 4,
    onProgress: (done, total) => {
      if (done % 25 === 0 || done === total) {
        process.stdout.write(`\r       events ${done}/${total}`);
      }
    },
  });
  process.stdout.write('\n');
  console.log(`       ${entries.length} attempts collected in ${fmt(Date.now() - t0)}`);

  console.log('2/3  Aggregating + hydrating teams…');
  const t1 = Date.now();
  const naive = buildSkillsLeaderboard(entries, { hydratedTeams: new Map() });
  const teamIds = naive.map((r) => r.team.id);
  console.log(`       ${teamIds.length} unique teams to hydrate`);
  const hydrated = await hydrateTeams(teamIds, { concurrency: 6 });
  console.log(`       hydrated ${hydrated.size} teams in ${fmt(Date.now() - t1)}`);

  console.log('3/3  Building final leaderboard + writing cache…');
  const lb = buildSkillsLeaderboard(entries, { hydratedTeams: hydrated });
  putCache(fullLeaderboardKey(seasonId, programCode), FRESH_FULL_TTL_SECONDS, {
    at: Date.now(),
    kind: 'full' as const,
    ttl: FRESH_FULL_TTL_SECONDS,
    data: lb,
  });
  console.log(
    `       wrote ${lb.length} ranked teams. top: #1 ${lb[0]?.team.number} (${lb[0]?.totalScore})`
  );
  console.log(`=== done in ${fmt(Date.now() - start)} ===`);
}

async function main() {
  const args = parseArgs(process.argv);

  let targets: { seasonId: number; programCode: string }[] = [];
  if (args.all) {
    targets = KNOWN_SEASONS.map((s) => ({
      seasonId: s.id,
      programCode: s.programCode,
    }));
  } else {
    const seasonId = args.season ?? CURRENT_V5RC_SEASON.id;
    const info = findSeasonById(seasonId) || CURRENT_V5RC_SEASON;
    targets.push({ seasonId, programCode: args.program || info.programCode });
  }

  for (const t of targets) {
    try {
      await warmOne(t.seasonId, t.programCode);
    } catch (err) {
      console.error(`!!! Failed to warm ${t.seasonId} (${t.programCode})`);
      console.error(err);
    }
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
