// V5RC season catalog. `id` matches the RobotEvents API season id.
export interface SeasonInfo {
  id: number;
  name: string;          // long label
  short: string;         // ui label, e.g. "2025-2026 · Push Back"
  game: string;          // e.g. "Push Back"
  years: string;         // e.g. "2025-2026"
  programCode: 'V5RC';
}

export const V5RC_SEASONS: SeasonInfo[] = [
  {
    id: 197,
    name: 'VEX V5 Robotics Competition 2025-2026: Push Back',
    short: '2025-2026 · Push Back',
    game: 'Push Back',
    years: '2025-2026',
    programCode: 'V5RC',
  },
  {
    id: 190,
    name: 'VEX V5 Robotics Competition 2024-2025: High Stakes',
    short: '2024-2025 · High Stakes',
    game: 'High Stakes',
    years: '2024-2025',
    programCode: 'V5RC',
  },
  {
    id: 181,
    name: 'VEX V5 Robotics Competition 2023-2024: Over Under',
    short: '2023-2024 · Over Under',
    game: 'Over Under',
    years: '2023-2024',
    programCode: 'V5RC',
  },
  {
    id: 173,
    name: 'VEX V5 Robotics Competition 2022-2023: Spin Up',
    short: '2022-2023 · Spin Up',
    game: 'Spin Up',
    years: '2022-2023',
    programCode: 'V5RC',
  },
];

export const CURRENT_SEASON = V5RC_SEASONS[0];

export function findSeason(id: number | string | null | undefined): SeasonInfo {
  if (!id && id !== 0) return CURRENT_SEASON;
  const idNum = typeof id === 'string' ? parseInt(id) : id;
  return V5RC_SEASONS.find((s) => s.id === idNum) || CURRENT_SEASON;
}

// 2026 V5 Robotics Worlds (High School)
export const WORLDS_EVENT = {
  id: 64025,
  name: '2026 VEX Robotics World Championship',
  short: 'World Championship',
};
