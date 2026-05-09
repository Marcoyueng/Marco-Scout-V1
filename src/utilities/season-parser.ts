// Season metadata and detection helpers. Drives the Skills page and any other
// surface that needs to scope rankings to a single competition season.
//
// Adding a new season: append to KNOWN_SEASONS — order is "newest first".

export interface SeasonInfo {
  id: number;
  name: string;
  short: string;
  programCode: string; // V5RC, VURC, VIQRC, etc.
  /** Lower-case keywords used to detect a season from event names / SKUs. */
  keywords: string[];
}

export const KNOWN_SEASONS: SeasonInfo[] = [
  {
    id: 197,
    name: 'V5RC 2025-2026: Push Back',
    short: 'Push Back',
    programCode: 'V5RC',
    keywords: ['push back', 'pushback'],
  },
  {
    id: 190,
    name: 'V5RC 2024-2025: High Stakes',
    short: 'High Stakes',
    programCode: 'V5RC',
    keywords: ['high stakes', 'highstakes'],
  },
  {
    id: 181,
    name: 'V5RC 2023-2024: Over Under',
    short: 'Over Under',
    programCode: 'V5RC',
    keywords: ['over under', 'overunder'],
  },
  {
    id: 173,
    name: 'V5RC 2022-2023: Spin Up',
    short: 'Spin Up',
    programCode: 'V5RC',
    keywords: ['spin up', 'spinup'],
  },
];

export const CURRENT_V5RC_SEASON: SeasonInfo = KNOWN_SEASONS[0];

export function findSeasonById(id: number): SeasonInfo | undefined {
  return KNOWN_SEASONS.find((s) => s.id === id);
}

/**
 * Best-effort: detect a season from a raw RobotEvents API season object,
 * an event name, or an event SKU. Returns undefined when nothing matches.
 */
export function detectSeason(input: {
  apiSeason?: { id?: number; name?: string };
  eventName?: string;
  sku?: string;
}): SeasonInfo | undefined {
  const id = input.apiSeason?.id;
  if (id) {
    const direct = findSeasonById(id);
    if (direct) return direct;
  }

  const haystack = `${input.apiSeason?.name || ''} ${input.eventName || ''} ${
    input.sku || ''
  }`.toLowerCase();
  for (const s of KNOWN_SEASONS) {
    if (s.keywords.some((kw) => haystack.includes(kw))) return s;
  }
  return undefined;
}
