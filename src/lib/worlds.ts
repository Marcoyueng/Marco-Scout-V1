// Helpers shared by /api/worlds/* routes. Mirrors the BALLBALL Tech console
// `_ensure_predicted_divisions` and division refresh logic, adapted to use
// the live RobotEvents API for ground truth (no local mirror DB).

import { db } from './db';
import { robotevents } from './robotevents';

export const WORLDS_EVENT_ID = parseInt(
  process.env.WORLDS_EVENT_ID || '64025'
);

export const WORLDS_DIVISION_NAMES = [
  'Science',
  'Technology',
  'Engineering',
  'Research',
  'Arts',
  'Spirit',
  'Math',
  'Opportunity',
  'Innovation',
  'Design',
];

function teamSortKey(tn: string): [number, string] {
  const m = /^(\d+)(.*)$/.exec(tn);
  if (m) return [parseInt(m[1]), m[2]];
  return [999999, tn];
}

/**
 * If real (non-predicted) divisions are already cached locally, return them.
 * Otherwise generate a round-robin predicted assignment from registered teams.
 */
export async function ensurePredictedDivisions(): Promise<void> {
  const real = (db()
    .prepare('SELECT COUNT(*) as c FROM worlds_divisions WHERE is_predicted = 0')
    .get() as { c: number }).c;
  if (real > 0) return;

  // Fetch registered teams via RE API.
  const teams = await robotevents.pagedAll(
    `events/${WORLDS_EVENT_ID}/teams`,
    20,
    250
  );
  const numbers: string[] = (teams as any[])
    .map((t: any) => t.number || t.team || '')
    .filter(Boolean);

  if (!numbers.length) return;

  const existing = (db()
    .prepare('SELECT COUNT(*) as c FROM worlds_divisions WHERE is_predicted = 1')
    .get() as { c: number }).c;
  if (existing === numbers.length) return;

  numbers.sort((a, b) => {
    const [na, sa] = teamSortKey(a);
    const [nb, sb] = teamSortKey(b);
    if (na !== nb) return na - nb;
    return sa.localeCompare(sb);
  });

  const conn = db();
  const tx = conn.transaction((nums: string[]) => {
    conn.prepare('DELETE FROM worlds_divisions WHERE is_predicted = 1').run();
    const ins = conn.prepare(
      'INSERT OR IGNORE INTO worlds_divisions (team_number, division_name, is_predicted) VALUES (?, ?, 1)'
    );
    const n = WORLDS_DIVISION_NAMES.length;
    nums.forEach((tn, i) => ins.run(tn, WORLDS_DIVISION_NAMES[i % n]));
  });
  tx(numbers);
}

export async function refreshDivisionsFromAPI(): Promise<{
  ok: boolean;
  divisions: number;
  msg?: string;
}> {
  const event = await robotevents.getEvent(WORLDS_EVENT_ID);
  const divs: any[] = event?.divisions || [];
  if (divs.length <= 1) {
    return { ok: false, divisions: divs.length, msg: 'Divisions not yet assigned' };
  }
  const conn = db();
  conn.prepare('DELETE FROM worlds_divisions').run();
  const ins = conn.prepare(
    'INSERT OR IGNORE INTO worlds_divisions (team_number, division_name, division_id, is_predicted) VALUES (?, ?, ?, 0)'
  );
  for (const d of divs) {
    const teams = await robotevents.pagedAll(
      `events/${WORLDS_EVENT_ID}/divisions/${d.id}/teams`,
      4,
      250
    );
    for (const t of teams as any[]) {
      const tn = t.number || t.team || '';
      if (tn) ins.run(tn, d.name, d.id);
    }
  }
  return { ok: true, divisions: divs.length };
}
