// Utilities for detecting V5RC season identity from event metadata.
// We never invent data: detection only uses information already provided by the
// RobotEvents API (season.id, season.name, sku, event.name).

import { CURRENT_SEASON, V5RC_SEASONS, SeasonInfo, findSeason } from './constants';

const KEYWORD_TO_SEASON: { keyword: string; seasonId: number }[] = [
  { keyword: 'push back', seasonId: 197 },
  { keyword: 'high stakes', seasonId: 190 },
  { keyword: 'over under', seasonId: 181 },
  { keyword: 'spin up', seasonId: 173 },
];

export interface ParsedSeason {
  season: SeasonInfo;
  /** Source of detection so callers can show provenance if needed. */
  source: 'season-id' | 'season-name' | 'event-keyword' | 'sku-year' | 'fallback';
}

/**
 * Resolve season info from any combination of:
 * - explicit season id
 * - season name string ("VEX V5 Robotics Competition 2025-2026: Push Back")
 * - event name (often contains the game keyword)
 * - SKU prefix (e.g. "RE-V5RC-26-..." → 2025-2026 season → Push Back)
 */
export function detectSeason(opts: {
  seasonId?: number | null;
  seasonName?: string | null;
  eventName?: string | null;
  sku?: string | null;
}): ParsedSeason {
  // 1) trust explicit season.id from the API.
  if (opts.seasonId) {
    const s = V5RC_SEASONS.find((x) => x.id === opts.seasonId);
    if (s) return { season: s, source: 'season-id' };
  }

  // 2) match against canonical season name (case insensitive).
  if (opts.seasonName) {
    const lower = opts.seasonName.toLowerCase();
    for (const s of V5RC_SEASONS) {
      if (lower.includes(s.game.toLowerCase()) || lower.includes(s.years)) {
        return { season: s, source: 'season-name' };
      }
    }
  }

  // 3) game keyword in event name.
  if (opts.eventName) {
    const lower = opts.eventName.toLowerCase();
    for (const k of KEYWORD_TO_SEASON) {
      if (lower.includes(k.keyword)) {
        const s = V5RC_SEASONS.find((x) => x.id === k.seasonId);
        if (s) return { season: s, source: 'event-keyword' };
      }
    }
  }

  // 4) parse SKU like "RE-V5RC-26-1234" — 26 = 2025-2026.
  if (opts.sku) {
    const m = opts.sku.match(/-(\d{2})-/);
    if (m) {
      const yy = parseInt(m[1], 10);
      // RE SKU year is the *end* year of the season ("26" => 2025-2026).
      const endYear = 2000 + yy;
      const yearsLabel = `${endYear - 1}-${endYear}`;
      const s = V5RC_SEASONS.find((x) => x.years === yearsLabel);
      if (s) return { season: s, source: 'sku-year' };
    }
  }

  return { season: CURRENT_SEASON, source: 'fallback' };
}

/** Convenience: pull a SeasonInfo straight from a possibly-partial object. */
export function seasonForEventLike(ev: {
  season?: { id?: number; name?: string } | null;
  name?: string | null;
  sku?: string | null;
} | null | undefined): ParsedSeason {
  return detectSeason({
    seasonId: ev?.season?.id ?? null,
    seasonName: ev?.season?.name ?? null,
    eventName: ev?.name ?? null,
    sku: ev?.sku ?? null,
  });
}

export { findSeason };
