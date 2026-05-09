import {
  Team,
  Event,
  Match,
  Ranking,
  Skills,
  Award,
  PaginatedResponse,
  TeamStats,
  SearchFilters,
  SkillsLeaderboard,
} from '@/types/robotevents';
import { getStale, putCache } from './cache';

const API_BASE = 'https://www.robotevents.com/api/v2';
const API_TOKEN = process.env.ROBOTEVENTS_API_TOKEN;

if (!API_TOKEN) {
  console.warn('ROBOTEVENTS_API_TOKEN not found in environment variables');
}

type ListFilters = SearchFilters & { page?: number; per_page?: number };

// Per-URL TTL (seconds). Ranged matchers used in fetchWithRetry.
const URL_TTL_RULES: { test: (u: string) => boolean; ttl: number }[] = [
  { test: (u) => /\/teams\/\d+\/matches/.test(u), ttl: 1800 },
  { test: (u) => /\/teams\/\d+\/skills/.test(u), ttl: 1800 },
  { test: (u) => /\/teams\/\d+\/events/.test(u), ttl: 1800 },
  { test: (u) => /\/teams\/\d+\/awards/.test(u), ttl: 1800 },
  { test: (u) => /\/teams\/\d+(\?|$)/.test(u), ttl: 3600 },
  { test: (u) => /\/events\/\d+\/teams/.test(u), ttl: 1800 },
  { test: (u) => /\/events\/\d+\/divisions\/\d+\/matches/.test(u), ttl: 600 },
  { test: (u) => /\/events\/\d+\/divisions\/\d+\/rankings/.test(u), ttl: 600 },
  { test: (u) => /\/events\/\d+\/skills/.test(u), ttl: 1800 },
  { test: (u) => /\/events\/\d+\/awards/.test(u), ttl: 1800 },
  { test: (u) => /\/events\/\d+(\?|$)/.test(u), ttl: 3600 },
  { test: (u) => /\/events\?/.test(u), ttl: 600 },
  { test: (u) => /\/teams\?/.test(u), ttl: 600 },
  { test: (u) => /\/seasons\/\d+\/skills/.test(u), ttl: 1800 },
  { test: (u) => /\/seasons\/\d+\/events/.test(u), ttl: 600 },
];

function ttlForUrl(url: string): number {
  for (const r of URL_TTL_RULES) if (r.test(url)) return r.ttl;
  return 300;
}

// Global concurrency limit shared across the whole module. RobotEvents
// rate-limits aggressively but tolerates short bursts; 429 responses fall
// through to the retry/backoff path in fetchWithRetry.
const MAX_INFLIGHT = 6;
let inflight = 0;
const queue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (inflight < MAX_INFLIGHT) {
        inflight++;
        resolve();
      } else {
        queue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

function releaseSlot() {
  inflight--;
  const next = queue.shift();
  if (next) next();
}

// Coalesce concurrent requests to the same URL.
const inflightByUrl = new Map<string, Promise<any>>();

class RobotEventsAPI {
  private headers: HeadersInit;
  private _skillsHydrationMemo = new Map<string, Promise<Skills[]>>();

  constructor() {
    this.headers = {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  private async hydrateSkillsTeams(entries: Skills[]): Promise<Skills[]> {
    const out = entries.slice();
    const CONCURRENCY = 4;
    let next = 0;
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (next < out.length) {
        const i = next++;
        const tid = out[i]?.team?.id;
        if (!tid) continue;
        try {
          const full = await this.getTeam(tid);
          out[i] = {
            ...out[i],
            team: {
              ...out[i].team,
              grade: (full as any).grade || out[i].team.grade || '',
              location: (full as any).location || out[i].team.location,
              program: (full as any).program || out[i].team.program,
            },
          } as Skills;
        } catch {
          /* leave entry unenriched on hydration error */
        }
      }
    });
    await Promise.all(workers);
    return out;
  }

  private async fetchWithRetry<T>(url: string, retries = 5): Promise<T> {
    const cacheKey = `url:${url}`;

    // Serve fresh cached value if available.
    const fresh = getStale<{ at: number; ttl: number; data: T }>(cacheKey);
    if (fresh && fresh.at + fresh.ttl * 1000 > Date.now()) {
      return fresh.data;
    }

    // Coalesce parallel calls for the same URL.
    if (inflightByUrl.has(url)) {
      return inflightByUrl.get(url) as Promise<T>;
    }

    const p = (async () => {
      await acquireSlot();
      try {
        let lastError: unknown;
        for (let i = 0; i < retries; i++) {
          try {
            const response = await fetch(url, { headers: this.headers });
            if (!response.ok) {
              if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('retry-after') || '0');
                const wait = retryAfter > 0
                  ? retryAfter * 1000
                  : Math.min(20000, 2000 * Math.pow(2, i));
                await new Promise((r) => setTimeout(r, wait));
                continue;
              }
              const text = await response.text().catch(() => '');
              throw new Error(
                `API Error: ${response.status} ${response.statusText} - ${text.slice(0, 200)}`
              );
            }
            const data = (await response.json()) as T;
            const ttl = ttlForUrl(url);
            putCache(cacheKey, ttl, { at: Date.now(), ttl, data });
            return data;
          } catch (error) {
            lastError = error;
            if (i === retries - 1) break;
            await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
          }
        }
        // If we have any stale cached version, serve it instead of failing.
        if (fresh) {
          console.warn(`[robotevents] serving stale cache for ${url}`);
          return fresh.data;
        }
        throw lastError instanceof Error ? lastError : new Error('Max retries exceeded');
      } finally {
        releaseSlot();
        inflightByUrl.delete(url);
      }
    })();

    inflightByUrl.set(url, p);
    return p;
  }

  private buildPagination(params: URLSearchParams, filters: { page?: number; per_page?: number }) {
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
  }

  // Normalize raw RobotEvents API team into our Team shape
  private normalizeTeam(raw: any): Team {
    if (!raw) return raw;
    const loc = raw.location || {};
    return {
      ...raw,
      team: raw.number ?? raw.team ?? '',
      name: raw.team_name ?? raw.name ?? '',
      team_number: raw.number ?? raw.team_number,
      organization: raw.organization ?? '',
      grade: raw.grade ?? '',
      registered: raw.registered ?? false,
      location: {
        venue: loc.venue ?? '',
        address_1: loc.address_1 ?? '',
        address_2: loc.address_2,
        city: loc.city ?? '',
        region: loc.region ?? '',
        country: loc.country ?? '',
        postal_code: loc.postal_code ?? loc.postcode ?? '',
        lat: loc.coordinates?.lat ?? loc.lat,
        lng: loc.coordinates?.lon ?? loc.lng,
      },
    } as Team;
  }

  private normalizePaginated<T>(raw: any, mapItem: (x: any) => T): PaginatedResponse<T> {
    const meta = raw?.meta || {};
    return {
      data: Array.isArray(raw?.data) ? raw.data.map(mapItem) : [],
      pagination: {
        page: meta.current_page ?? 1,
        per_page: meta.per_page ?? 0,
        total: meta.total ?? 0,
        total_pages: meta.last_page ?? 1,
      },
    };
  }

  private normalizeSkill(raw: any): Skills {
    const t = raw?.team || {};
    return {
      ...raw,
      team: {
        id: t.id,
        team: t.name || t.team || '',
        number: t.name || t.team || '',
        name: t.team_name || t.name || '',
        team_name: t.team_name || t.name || '',
        organization: t.organization || '',
        location: t.location || { city: '', region: '', country: '' },
        grade: t.grade || '',
        program: t.program || '',
        ...t,
      },
    } as Skills;
  }

  private normalizeAward(raw: any): Award {
    const winner = (raw?.teamWinners && raw.teamWinners[0]) || null;
    const teamObj = winner?.team
      ? this.normalizeTeam({ id: winner.team.id, number: winner.team.name, team_name: winner.team.name })
      : undefined;
    return {
      id: raw.id,
      event: raw.event,
      team: teamObj,
      title: raw.title,
      description: Array.isArray(raw.qualifications)
        ? raw.qualifications.join(', ')
        : raw.designation || '',
      order: raw.order,
      season: raw.season || raw.event?.season || { id: 0, name: '', code: '' },
    } as Award;
  }

  private normalizeMatch(raw: any): Match {
    const alliances = raw?.alliances || [];
    const red = alliances.find((a: any) => a.color === 'red') || { teams: [], score: 0 };
    const blue = alliances.find((a: any) => a.color === 'blue') || { teams: [], score: 0 };
    const mapAllianceTeams = (teams: any[]) =>
      (teams || []).map((t: any, i: number) => ({
        team: this.normalizeTeam({
          id: t?.team?.id,
          number: t?.team?.name,
          team_name: t?.team?.name,
        }),
        seat: i,
      }));

    // Note: RobotEvents `scored` flag does not reliably indicate "results in".
    // Treat the match as scored if either alliance has a non-zero score or the
    // API ships a completed/started timestamp, OR the API explicitly says so.
    const sumScores = (red.score ?? 0) + (blue.score ?? 0);
    const hasTimestamp = !!(raw.completed || raw.started);
    const scoredFlag = !!raw.scored || sumScores > 0 || hasTimestamp;

    return {
      id: raw.id,
      division_id: raw.division?.id ?? 1,
      division_name: raw.division?.name,
      round: raw.round,
      instance: raw.instance,
      match_num: raw.matchnum ?? raw.match_num,
      name: raw.name,
      scheduled: raw.scheduled,
      started: raw.started,
      completed: raw.completed,
      score_red: red.score ?? 0,
      score_blue: blue.score ?? 0,
      alliance_red: { teams: mapAllianceTeams(red.teams), score: red.score, side: 'red' },
      alliance_blue: { teams: mapAllianceTeams(blue.teams), score: blue.score, side: 'blue' },
      field: raw.field,
      scored: scoredFlag,
      event: raw.event
        ? { id: raw.event.id, name: raw.event.name, code: raw.event.code }
        : undefined,
      winner: !scoredFlag
        ? undefined
        : (red.score ?? 0) > (blue.score ?? 0)
        ? 'red'
        : (blue.score ?? 0) > (red.score ?? 0)
        ? 'blue'
        : 'tie',
    } as Match;
  }

  // ===== Teams =====
  async getTeams(filters: ListFilters = {}): Promise<PaginatedResponse<Team>> {
    const params = new URLSearchParams();
    if (filters.query) params.append('number[]', filters.query);
    if (filters.program) params.append('program[]', filters.program);
    if (filters.season) params.append('season[]', filters.season.toString());
    if (filters.grade) params.append('grade[]', filters.grade);
    if (filters.region) params.append('region', filters.region);
    if (filters.country) params.append('country', filters.country);
    this.buildPagination(params, filters);

    const raw = await this.fetchWithRetry<any>(`${API_BASE}/teams?${params.toString()}`);
    return this.normalizePaginated<Team>(raw, (t) => this.normalizeTeam(t));
  }

  async getTeam(id: number): Promise<Team> {
    const raw = await this.fetchWithRetry<any>(`${API_BASE}/teams/${id}`);
    return this.normalizeTeam(raw);
  }

  async getTeamMatches(
    id: number,
    filters: { season?: number; page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Match>> {
    const params = new URLSearchParams();
    if (filters.season) params.append('season[]', filters.season.toString());
    this.buildPagination(params, filters);
    const raw = await this.fetchWithRetry<any>(
      `${API_BASE}/teams/${id}/matches?${params.toString()}`
    );
    return this.normalizePaginated<Match>(raw, (m) => this.normalizeMatch(m));
  }

  async getTeamSkills(
    id: number,
    filters: { season?: number; page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Skills>> {
    const params = new URLSearchParams();
    if (filters.season) params.append('season[]', filters.season.toString());
    this.buildPagination(params, filters);
    return this.fetchWithRetry<PaginatedResponse<Skills>>(
      `${API_BASE}/teams/${id}/skills?${params.toString()}`
    );
  }

  async getTeamAwards(
    id: number,
    filters: { season?: number; page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Award>> {
    const params = new URLSearchParams();
    if (filters.season) params.append('season[]', filters.season.toString());
    this.buildPagination(params, filters);
    const raw = await this.fetchWithRetry<any>(
      `${API_BASE}/teams/${id}/awards?${params.toString()}`
    );
    return this.normalizePaginated<Award>(raw, (a) => this.normalizeAward(a));
  }

  async getTeamEvents(
    id: number,
    filters: { season?: number; page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams();
    if (filters.season) params.append('season[]', filters.season.toString());
    this.buildPagination(params, filters);
    return this.fetchWithRetry<PaginatedResponse<Event>>(
      `${API_BASE}/teams/${id}/events?${params.toString()}`
    );
  }

  // ===== Events =====
  async getEvents(filters: ListFilters = {}): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams();
    if (filters.query) params.append('name', filters.query);
    if (filters.program) params.append('program[]', filters.program);
    if (filters.season) params.append('season[]', filters.season.toString());
    if (filters.region) params.append('region', filters.region);
    if (filters.country) params.append('country', filters.country);
    if (filters.event_type) params.append('eventTypes[]', filters.event_type);
    if (filters.level) params.append('level[]', filters.level);
    this.buildPagination(params, filters);

    const raw = await this.fetchWithRetry<any>(`${API_BASE}/events?${params.toString()}`);
    return this.normalizePaginated<Event>(raw, (e) => e as Event);
  }

  async getEvent(id: number): Promise<Event> {
    return this.fetchWithRetry<Event>(`${API_BASE}/events/${id}`);
  }

  async getEventTeams(
    id: number,
    filters: { page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Team>> {
    const params = new URLSearchParams();
    this.buildPagination(params, filters);
    const raw = await this.fetchWithRetry<any>(
      `${API_BASE}/events/${id}/teams?${params.toString()}`
    );
    return this.normalizePaginated<Team>(raw, (t) => this.normalizeTeam(t));
  }

  async getEventMatches(
    id: number,
    filters: { page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Match>> {
    const params = new URLSearchParams();
    this.buildPagination(params, filters);
    const raw = await this.fetchWithRetry<any>(
      `${API_BASE}/events/${id}/divisions/1/matches?${params.toString()}`
    );
    return this.normalizePaginated<Match>(raw, (m) => this.normalizeMatch(m));
  }

  async getEventRankings(
    id: number,
    filters: { page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Ranking>> {
    const params = new URLSearchParams();
    this.buildPagination(params, filters);
    return this.fetchWithRetry<PaginatedResponse<Ranking>>(
      `${API_BASE}/events/${id}/divisions/1/rankings?${params.toString()}`
    );
  }

  async getEventSkills(
    id: number,
    filters: { page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Skills>> {
    const params = new URLSearchParams();
    this.buildPagination(params, filters);
    const raw = await this.fetchWithRetry<any>(
      `${API_BASE}/events/${id}/skills?${params.toString()}`
    );
    return this.normalizePaginated<Skills>(raw, (s) => this.normalizeSkill(s));
  }

  async getEventAwards(
    id: number,
    filters: { page?: number; per_page?: number } = {}
  ): Promise<PaginatedResponse<Award>> {
    const params = new URLSearchParams();
    this.buildPagination(params, filters);
    const raw = await this.fetchWithRetry<any>(
      `${API_BASE}/events/${id}/awards?${params.toString()}`
    );
    return this.normalizePaginated<Award>(raw, (a) => this.normalizeAward(a));
  }

  // ===== Skills =====
  async getSkills(
    filters: ListFilters & { type?: 'driver' | 'programming' } = {}
  ): Promise<PaginatedResponse<Skills>> {
    const params = new URLSearchParams();
    if (filters.season) params.append('season[]', filters.season.toString());
    if (filters.type) params.append('type', filters.type);
    this.buildPagination(params, filters);
    const raw = await this.fetchWithRetry<any>(
      `${API_BASE}/seasons/${filters.season || 197}/skills?${params.toString()}`
    );
    return this.normalizePaginated<Skills>(raw, (s) => this.normalizeSkill(s));
  }

  async getSkillsLeaderboard(
    filters: ListFilters & { type?: 'driver' | 'programming' | 'total' } = {}
  ): Promise<SkillsLeaderboard> {
    // The RobotEvents v2 API does not expose a global by-season skills endpoint.
    // We aggregate skills from events in the requested season and dedupe per team
    // by keeping the highest-scoring entry. For Push Back (197), this primarily
    // reflects Worlds-qualifier and Worlds skills.
    const seasonId = filters.season || 197;
    const type = (filters.type as 'total' | 'driver' | 'programming') || 'total';
    const page = filters.page || 1;
    const perPage = filters.per_page || 50;

    // Pull events for the season (capped) and sample top events that already have skills.
    const eventsResp = await this.getEvents({ season: seasonId, per_page: 250, page: 1 }).catch(
      () => ({ data: [] as Event[], pagination: { page: 1, per_page: 0, total: 0, total_pages: 0 } })
    );

    // Prefer the World Championship + the most recent events.
    const events = (eventsResp.data || []).slice().sort((a, b) => {
      const aIsWorlds = /World Championship/i.test(a.name) ? 1 : 0;
      const bIsWorlds = /World Championship/i.test(b.name) ? 1 : 0;
      if (aIsWorlds !== bIsWorlds) return bIsWorlds - aIsWorlds;
      return (b.start || '').localeCompare(a.start || '');
    });

    // Limit how many events we fetch skills for to bound API usage.
    const sample = events.slice(0, 25);

    const allSkills: Skills[] = [];
    for (const ev of sample) {
      try {
        const r = await this.getEventSkills(ev.id, { per_page: 250 });
        for (const s of r.data || []) allSkills.push(s);
      } catch {
        /* skip event on error */
      }
    }

    // Dedupe per team by keeping max per type, plus a synthetic "total" combining
    // a team's best driver + best programming for the season.
    type Bucket = { team: Skills['team']; event: Skills['event']; score: number; type: any };
    const bestDriver = new Map<number, Skills>();
    const bestProg = new Map<number, Skills>();
    for (const s of allSkills) {
      if (!s?.team?.id) continue;
      if (s.type === 'driver') {
        const cur = bestDriver.get(s.team.id);
        if (!cur || s.score > cur.score) bestDriver.set(s.team.id, s);
      } else if (s.type === 'programming') {
        const cur = bestProg.get(s.team.id);
        if (!cur || s.score > cur.score) bestProg.set(s.team.id, s);
      }
    }

    let combined: Skills[];
    if (type === 'driver') {
      combined = Array.from(bestDriver.values());
    } else if (type === 'programming') {
      combined = Array.from(bestProg.values());
    } else {
      const teamIds = new Set<number>();
      bestDriver.forEach((_v, k) => teamIds.add(k));
      bestProg.forEach((_v, k) => teamIds.add(k));
      combined = Array.from(teamIds).map((tid) => {
        const d = bestDriver.get(tid);
        const p = bestProg.get(tid);
        const base = d || p!;
        return {
          ...base,
          score: (d?.score || 0) + (p?.score || 0),
          type: 'total' as any,
        } as Skills;
      });
    }

    // The per-event skills endpoint only returns team id+name. We hydrate
    // grade/location/program for the top-scoring slice on demand, then
    // memoize the enriched list on the instance so filter combos and pages
    // share a single hydration pass per (season,type) for the process lifetime
    // (the underlying getTeam calls are also URL-cached for 1h).
    const sortedByScore = combined.slice().sort((a, b) => b.score - a.score);
    const wantsHydration =
      !!(filters.grade || filters.country || filters.region || filters.program);

    if (wantsHydration) {
      const memoKey = `${seasonId}:${type}`;
      let memo = this._skillsHydrationMemo.get(memoKey);
      if (!memo) {
        memo = this.hydrateSkillsTeams(sortedByScore.slice(0, 200));
        this._skillsHydrationMemo.set(memoKey, memo);
      }
      const hydrated = await memo;
      for (let i = 0; i < hydrated.length; i++) sortedByScore[i] = hydrated[i];
    }

    const matchesFilter = (s: Skills) => {
      if (filters.grade && s.team.grade !== filters.grade) return false;
      if (filters.country && s.team.location?.country !== filters.country) return false;
      if (filters.region && s.team.location?.region !== filters.region) return false;
      if (filters.program) {
        const code =
          typeof s.team.program === 'object' && s.team.program
            ? (s.team.program as any).code
            : s.team.program;
        if (code !== filters.program) return false;
      }
      return true;
    };

    const sorted = sortedByScore.filter(matchesFilter);
    const total = sorted.length;
    const start = (page - 1) * perPage;
    const slice = sorted.slice(start, start + perPage);

    return {
      skills: slice,
      type,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  // ===== Aggregated stats =====
  /** Public escape hatch: GET an arbitrary RE v2 path with caching/concurrency. */
  async raw<T = any>(pathOrUrl: string): Promise<T> {
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : `${API_BASE}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
    return this.fetchWithRetry<T>(url);
  }

  /** Fetch every page (up to maxPages * per_page items). */
  async pagedAll<T = any>(path: string, maxPages = 20, perPage = 250): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const sep = path.includes('?') ? '&' : '?';
      const url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}${sep}page=${page}&per_page=${perPage}`;
      const raw = await this.fetchWithRetry<any>(url);
      const items: T[] = Array.isArray(raw?.data) ? raw.data : [];
      out.push(...items);
      const last = raw?.meta?.last_page ?? 1;
      if (page >= last || items.length < perPage) break;
    }
    return out;
  }

  async getEventDivisionMatches(
    eventId: number,
    divisionId: number,
    filters: { page?: number; per_page?: number } = {}
  ): Promise<Match[]> {
    const params = new URLSearchParams();
    this.buildPagination(params, filters);
    const raw = await this.fetchWithRetry<any>(
      `${API_BASE}/events/${eventId}/divisions/${divisionId}/matches?${params.toString()}`
    );
    const items = Array.isArray(raw?.data) ? raw.data : [];
    return items.map((m: any) => this.normalizeMatch(m));
  }

  async getEventDivisionRankings(
    eventId: number,
    divisionId: number
  ): Promise<any[]> {
    const items = await this.pagedAll(
      `events/${eventId}/divisions/${divisionId}/rankings`,
      10,
      250
    );
    return items;
  }

  async getTeamStats(teamId: number, seasonId?: number): Promise<TeamStats> {
    const [team, matchesResp, skillsResp, awardsResp, eventsResp] = await Promise.all([
      this.getTeam(teamId),
      this.getTeamMatches(teamId, { season: seasonId, per_page: 100 }),
      this.getTeamSkills(teamId, { season: seasonId, per_page: 100 }),
      this.getTeamAwards(teamId, { season: seasonId, per_page: 100 }),
      this.getTeamEvents(teamId, { season: seasonId, per_page: 50 }).catch(() => ({
        data: [] as Event[],
        pagination: { page: 1, per_page: 0, total: 0, total_pages: 0 },
      })),
    ]);

    const matches = matchesResp.data || [];
    const skills = skillsResp.data || [];
    const awards = awardsResp.data || [];
    const events = eventsResp.data || [];

    let wins = 0;
    let losses = 0;
    let ties = 0;
    let totalScore = 0;
    let totalMargin = 0;
    let highestScore = 0;

    const teamMatches = matches.filter((m) =>
      [
        ...(m.alliance_red?.teams || []),
        ...(m.alliance_blue?.teams || []),
      ].some((t) => t.team?.id === teamId)
    );

    teamMatches.forEach((match) => {
      const onRed = (match.alliance_red?.teams || []).some((t) => t.team?.id === teamId);
      const myScore = onRed ? match.score_red : match.score_blue;
      const opponentScore = onRed ? match.score_blue : match.score_red;

      totalScore += myScore;
      totalMargin += myScore - opponentScore;
      if (myScore > highestScore) highestScore = myScore;

      if (myScore > opponentScore) wins++;
      else if (myScore < opponentScore) losses++;
      else ties++;
    });

    const driverSkills = skills.filter((s) => s.type === 'driver').sort((a, b) => b.score - a.score);
    const programmingSkills = skills
      .filter((s) => s.type === 'programming')
      .sort((a, b) => b.score - a.score);

    const bestDriver = driverSkills[0]?.score || 0;
    const bestProgramming = programmingSkills[0]?.score || 0;

    const recentPerformance = teamMatches.slice(-10).map((match) => {
      const onRed = (match.alliance_red?.teams || []).some((t) => t.team?.id === teamId);
      const myScore = onRed ? match.score_red : match.score_blue;
      const opponentScore = onRed ? match.score_blue : match.score_red;
      const result: 'win' | 'loss' | 'tie' =
        myScore > opponentScore ? 'win' : myScore < opponentScore ? 'loss' : 'tie';
      return {
        date: match.started || match.scheduled,
        score: myScore,
        result,
      };
    });

    return {
      team,
      totalSkills: bestDriver + bestProgramming,
      driverSkills: bestDriver,
      programmingSkills: bestProgramming,
      matchHistory: teamMatches,
      record: { wins, losses, ties },
      averageScore: teamMatches.length ? totalScore / teamMatches.length : 0,
      averageMargin: teamMatches.length ? totalMargin / teamMatches.length : 0,
      highestScore,
      recentEvents: events,
      awards,
      recentPerformance,
      partnerHistory: [],
      opponentHistory: [],
    };
  }
}

export const robotevents = new RobotEventsAPI();
