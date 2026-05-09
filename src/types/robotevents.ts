// RobotEvents API Types

export interface Team {
  id: number;
  name: string;
  team: string;
  organization: string;
  location: {
    city: string;
    region: string;
    country: string;
    venue?: string;
    lat?: number;
    lng?: number;
  };
  grade: string;
  program: {
    id: number;
    code: string;
    name: string;
  };
  registered: boolean;
  robot_name?: string;
  team_number?: number;
  sku?: string;
}

export interface Event {
  id: number;
  name: string;
  sku: string;
  season: {
    id: number;
    name: string;
    code: string;
  };
  program: {
    id: number;
    code: string;
    name: string;
  };
  start: string;
  end: string;
  location: {
    venue: string;
    address_1: string;
    address_2?: string;
    city: string;
    region: string;
    country: string;
    postal_code: string;
    lat?: number;
    lng?: number;
  };
  level: string;
  divisions?: Division[];
  ongoing: boolean;
  rankings_available: boolean;
  skills_available: boolean;
  teams?: Team[];
}

export interface Division {
  id: number;
  name: string;
  code: string;
  event_id: number;
  level: string;
  rankings_available: boolean;
  skills_available: boolean;
}

export interface Match {
  id: number;
  division_id: number;
  division_name?: string;
  round: number;
  instance: number;
  match_num: number;
  /** Human-readable label from RobotEvents, e.g. "Qualifier #12" or "QF 2-1". */
  name?: string;
  scheduled: string;
  started: string;
  completed: string;
  score_red: number;
  score_blue: number;
  alliance_red: Alliance;
  alliance_blue: Alliance;
  field?: string;
  winner?: string;
  scored?: boolean;
  /** Originating event metadata when available (always present from the API). */
  event?: {
    id: number;
    name: string;
    code?: string | null;
  };
}

export interface Alliance {
  teams: AllianceTeam[];
  score?: number;
  side?: string;
}

export interface AllianceTeam {
  team: Team;
  seat: number;
}

export interface Ranking {
  team: Team;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  wp: number;
  ap: number;
  sp: number;
  average_points: number;
  highest_score: number;
  total_points: number;
}

export interface Skills {
  id: number;
  team: Team;
  event: Event;
  type: 'driver' | 'programming';
  rank: number;
  score: number;
  attempts: number;
  season: {
    id: number;
    name: string;
    code: string;
  };
  program: {
    id: number;
    code: string;
    name: string;
  };
}

export interface Award {
  id: number;
  event: Event;
  team?: Team;
  title: string;
  description?: string;
  order: number;
  season: {
    id: number;
    name: string;
    code: string;
  };
}

export interface Season {
  id: number;
  name: string;
  code: string;
  current: boolean;
  program: {
    id: number;
    code: string;
    name: string;
  };
}

export interface Program {
  id: number;
  code: string;
  name: string;
  description: string;
  seasons: Season[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Custom types for our application
export interface TeamStats {
  team: Team;
  totalSkills?: number;
  driverSkills?: number;
  programmingSkills?: number;
  worldSkillsRank?: number;
  regionalSkillsRank?: number;
  matchHistory: Match[];
  record: {
    wins: number;
    losses: number;
    ties: number;
  };
  averageScore: number;
  averageMargin: number;
  highestScore: number;
  recentEvents: Event[];
  awards: Award[];
  recentPerformance: {
    date: string;
    score: number;
    result: 'win' | 'loss' | 'tie';
  }[];
  partnerHistory: {
    team: Team;
    matches: number;
    wins: number;
  }[];
  opponentHistory: {
    team: Team;
    matches: number;
    wins: number;
  }[];
}

export interface EventStats {
  event: Event;
  teams: Team[];
  matches: Match[];
  rankings: Ranking[];
  skills: Skills[];
  awards: Award[];
}

export interface SkillsLeaderboard {
  skills: Skills[];
  type: 'total' | 'driver' | 'programming';
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface TeamComparison {
  teams: TeamStats[];
  skillsComparison: {
    [teamId: number]: {
      total: number;
      driver: number;
      programming: number;
    };
  };
  winRateComparison: {
    [teamId: number]: number;
  };
  averageScoreComparison: {
    [teamId: number]: number;
  };
  recentEventsComparison: {
    [teamId: number]: Event[];
  };
}

export interface SearchFilters {
  query?: string;
  program?: string;
  season?: string | number;
  grade?: string;
  region?: string;
  country?: string;
  event_type?: string;
  level?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
