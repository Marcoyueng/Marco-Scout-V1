// Pure sort/group utilities for match history. Operates on real RobotEvents
// shapes only — no synthesis.

import { Match, Event, Ranking, Skills, Award } from '@/types/robotevents';
import { SeasonInfo } from './constants';
import { seasonForEventLike } from './season-parser';

export function compareMatches(a: Match, b: Match): number {
  const ta = a.scheduled ? new Date(a.scheduled).getTime() : NaN;
  const tb = b.scheduled ? new Date(b.scheduled).getTime() : NaN;
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
  if (Number.isFinite(ta) && !Number.isFinite(tb)) return -1;
  if (!Number.isFinite(ta) && Number.isFinite(tb)) return 1;

  if ((a.round ?? 0) !== (b.round ?? 0)) return (a.round ?? 0) - (b.round ?? 0);
  if ((a.instance ?? 0) !== (b.instance ?? 0)) return (a.instance ?? 0) - (b.instance ?? 0);
  if ((a.match_num ?? 0) !== (b.match_num ?? 0)) return (a.match_num ?? 0) - (b.match_num ?? 0);
  return (a.id ?? 0) - (b.id ?? 0);
}

export function sortMatchesAsc(matches: Match[]): Match[] {
  return matches.slice().sort(compareMatches);
}

/**
 * RobotEvents round numbers map to round labels. Use match.name when present
 * (the API already provides labels like "Qualifier #12", "QF 2-1") and fall
 * back to deriving from round/instance/match_num.
 */
const ROUND_LABEL: Record<number, string> = {
  1: 'Practice',
  2: 'Qualifier',
  3: 'Round Robin',
  4: 'R16',
  5: 'QF',
  6: 'SF',
  7: 'Finals',
};

export function matchLabel(m: Match): string {
  if (m.name && m.name.trim()) return m.name.trim();
  const base = ROUND_LABEL[m.round] || `Round ${m.round}`;
  if (m.round && m.round >= 4) {
    return `${base} ${m.instance ?? 1}-${m.match_num ?? 1}`;
  }
  return `${base} #${m.match_num ?? m.instance ?? 1}`;
}

// ---------- Event grouping ----------

export interface EventBlock {
  event: {
    id: number;
    name: string;
    code?: string | null;
    start?: string;
    end?: string;
    location?: Event['location'];
    season?: { id?: number; name?: string };
  };
  matches: Match[];
  ranking?: Ranking | null;
  skills?: { driver?: Skills; programming?: Skills; total?: number };
  awards?: Award[];
}

export interface SeasonBlock {
  season: SeasonInfo;
  events: EventBlock[];
}

/** Group matches by their `event.id`. Each group is sorted chronologically. */
export function groupMatchesByEvent(
  matches: Match[],
  eventLookup?: Map<number, Partial<EventBlock['event']>>
): Map<number, EventBlock> {
  const blocks = new Map<number, EventBlock>();
  for (const m of matches) {
    const eid = m.event?.id;
    if (!eid) continue;
    let block = blocks.get(eid);
    if (!block) {
      const fromLookup = eventLookup?.get(eid);
      block = {
        event: {
          id: eid,
          name: m.event?.name || fromLookup?.name || `Event ${eid}`,
          code: m.event?.code ?? fromLookup?.code ?? null,
          ...fromLookup,
        },
        matches: [],
      };
      blocks.set(eid, block);
    }
    block.matches.push(m);
  }
  blocks.forEach((block) => {
    block.matches = sortMatchesAsc(block.matches);
  });
  return blocks;
}

/** Group event blocks by season (newest season first, newest event first). */
export function groupEventsBySeason(events: EventBlock[]): SeasonBlock[] {
  const bySeason = new Map<number, SeasonBlock>();
  for (const ev of events) {
    const parsed = seasonForEventLike({
      season: ev.event.season,
      name: ev.event.name,
      sku: ev.event.code,
    });
    let block = bySeason.get(parsed.season.id);
    if (!block) {
      block = { season: parsed.season, events: [] };
      bySeason.set(parsed.season.id, block);
    }
    block.events.push(ev);
  }

  bySeason.forEach((block) => {
    block.events.sort((a, b) => {
      const ta = a.event.start ? new Date(a.event.start).getTime() : 0;
      const tb = b.event.start ? new Date(b.event.start).getTime() : 0;
      // Inside a season newest events first.
      return tb - ta;
    });
  });

  const out: SeasonBlock[] = [];
  bySeason.forEach((b) => out.push(b));
  // Newest seasons first (V5RC_SEASONS list is already newest-first by id).
  return out.sort((a, b) => b.season.id - a.season.id);
}

/** Compute real win/loss/tie record for a team from already-fetched matches. */
export function computeRecord(matches: Match[], teamId: number) {
  let wins = 0,
    losses = 0,
    ties = 0,
    counted = 0;
  for (const m of matches) {
    if (!m.scored) continue;
    if (m.round === 1) continue; // skip practice
    const onRed = m.alliance_red?.teams?.some((t) => t.team?.id === teamId);
    const onBlue = m.alliance_blue?.teams?.some((t) => t.team?.id === teamId);
    if (!onRed && !onBlue) continue;
    counted++;
    if (m.winner === 'tie') ties++;
    else if ((onRed && m.winner === 'red') || (onBlue && m.winner === 'blue')) wins++;
    else if (m.winner === 'red' || m.winner === 'blue') losses++;
  }
  return { wins, losses, ties, played: counted };
}
