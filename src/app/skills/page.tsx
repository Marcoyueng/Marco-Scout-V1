'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import {
  SkillsFilters,
  FilterState,
  FacetCount,
} from '@/components/skills/SkillsFilters';
import { SkillsTable } from '@/components/skills/SkillsTable';
import { RankedTeamSkills } from '@/utilities/skills-ranking';
import { CURRENT_V5RC_SEASON, findSeasonById } from '@/utilities/season-parser';

interface SkillsApiResponse {
  season: { id: number; short: string; name: string; programCode: string };
  program: string;
  rows: RankedTeamSkills[];
  facets: {
    grades: FacetCount[];
    countries: FacetCount[];
    regions: FacetCount[];
  };
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  total_in_season: number;
  cache: { kind: 'partial' | 'full'; cached_at: string; stale: boolean };
}

const PER_PAGE = 50;

export default function SkillsPage() {
  const [filters, setFilters] = useState<FilterState>({
    seasonId: CURRENT_V5RC_SEASON.id,
    search: '',
    grade: '',
    country: '',
    region: '',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SkillsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search-driven re-fetches so typing isn't bouncing the server.
  const debouncedSearch = useDebounced(filters.search, 250);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        season: filters.seasonId,
        q: debouncedSearch,
        grade: filters.grade,
        country: filters.country,
        region: filters.region,
        page,
      }),
    [
      filters.seasonId,
      filters.grade,
      filters.country,
      filters.region,
      debouncedSearch,
      page,
    ]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      season: String(filters.seasonId),
      page: String(page),
      per_page: String(PER_PAGE),
    });
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (filters.grade) params.set('grade', filters.grade);
    if (filters.country) params.set('country', filters.country);
    if (filters.region) params.set('region', filters.region);

    fetch(`/api/skills?${params.toString()}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
        return j as SkillsApiResponse;
      })
      .then((d) => setData(d))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
    // queryKey covers all deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const [refreshing, setRefreshing] = useState(false);

  async function loadFullLeaderboard() {
    if (refreshing) return;
    setRefreshing(true);
    const params = new URLSearchParams({
      season: String(filters.seasonId),
      page: String(page),
      per_page: String(PER_PAGE),
      force: '1',
    });
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (filters.grade) params.set('grade', filters.grade);
    if (filters.country) params.set('country', filters.country);
    if (filters.region) params.set('region', filters.region);
    try {
      const r = await fetch(`/api/skills?${params.toString()}`);
      const j = (await r.json()) as SkillsApiResponse;
      if (j?.rows) setData(j);
    } catch {
      /* ignore */
    } finally {
      setRefreshing(false);
    }
  }

  // Reset to page 1 whenever filters change (but not when only the page changes).
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.seasonId,
    filters.grade,
    filters.country,
    filters.region,
    debouncedSearch,
  ]);

  const season = findSeasonById(filters.seasonId) || CURRENT_V5RC_SEASON;
  const totalRows = data?.pagination.total ?? 0;
  const totalSeason = data?.total_in_season ?? 0;
  const totalPages = data?.pagination.total_pages ?? 1;
  const startRank = (page - 1) * PER_PAGE + 1;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                SKILLS STANDINGS
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                {season.name} · {season.programCode} · aggregated from{' '}
                <a
                  href="https://www.robotevents.com/api/v2"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-zinc-700 hover:text-zinc-300"
                >
                  RobotEvents API v2
                </a>{' '}
                · best driver + best programming per team across all in-season
                events
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                Teams in season
              </div>
              <div className="text-xl font-bold tabular-nums text-white">
                {formatNumber(totalSeason)}
              </div>
              {data?.cache && (
                <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-zinc-500">
                  {data.cache.kind === 'partial' ? (
                    <span className="text-yellow-400">
                      Partial (top {data.total_in_season} from recent events)
                    </span>
                  ) : data.cache.stale ? (
                    <span className="text-zinc-400">
                      Stale · cached{' '}
                      {new Date(data.cache.cached_at).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-emerald-400">
                      Full · cached{' '}
                      {new Date(data.cache.cached_at).toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={loadFullLeaderboard}
                    disabled={refreshing}
                    className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                    title="Walk every event in the season. Slow (1-3 min) but pulls the complete official-style leaderboard."
                  >
                    {refreshing ? 'Loading full…' : 'Load full'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <SkillsFilters
          state={filters}
          onChange={setFilters}
          facets={data?.facets || null}
          totalRows={totalRows}
        />

        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {loading
              ? 'Loading…'
              : error
              ? `Error: ${error}`
              : `Showing ${data?.rows.length ?? 0} of ${formatNumber(
                  totalRows
                )} ranked teams`}
          </span>
          <span>
            Page {page} of {totalPages}
          </span>
        </div>

        <div className="mt-2">
          <SkillsTable
            rows={data?.rows || []}
            loading={loading && !data}
            startRank={startRank}
          />
        </div>

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 text-xs text-zinc-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
