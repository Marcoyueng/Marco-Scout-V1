/**
 * Power Rating calculator.
 *
 * Marco Scout Power Rating (MSPR) blends:
 *  - Skills (driver + programming) — 50%
 *  - Win rate across recent matches — 30%
 *  - Event activity (capped) — 20%
 *
 * Returns a 0–100 score suitable for ranking.
 */

export interface PowerInput {
  driverSkills?: number;
  programmingSkills?: number;
  totalMatches?: number;
  wins?: number;
  ties?: number;
  eventCount?: number;
}

const SKILLS_REF = 200; // typical strong combined skills score
const EVENTS_REF = 6;   // strong season activity

export function calcPowerRating(input: PowerInput): number {
  const driver = input.driverSkills || 0;
  const prog = input.programmingSkills || 0;
  const skills = driver + prog;
  const skillsNorm = Math.min(1, skills / SKILLS_REF);

  const matches = input.totalMatches || 0;
  const wins = input.wins || 0;
  const ties = input.ties || 0;
  const winRate = matches > 0 ? (wins + 0.5 * ties) / matches : 0;

  const events = Math.min(1, (input.eventCount || 0) / EVENTS_REF);

  const raw = 0.5 * skillsNorm + 0.3 * winRate + 0.2 * events;
  return Math.round(raw * 1000) / 10; // 0–100, one decimal
}

export function rankBucket(rating: number): { label: string; color: string } {
  if (rating >= 80) return { label: 'Elite', color: 'text-white' };
  if (rating >= 65) return { label: 'Strong', color: 'text-zinc-200' };
  if (rating >= 50) return { label: 'Solid', color: 'text-zinc-400' };
  if (rating >= 30) return { label: 'Developing', color: 'text-zinc-500' };
  return { label: 'New', color: 'text-zinc-600' };
}
