'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

type SearchResult =
  | { found: false }
  | {
      found: true;
      team: { team_number: string; division_name: string; is_predicted: number };
      division_name: string;
      is_predicted: boolean;
      top_teams: { team_number: string }[];
      division_stats: { total: number };
    };

export function WorldsSearch() {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  async function go(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`/api/worlds/search?q=${encodeURIComponent(q.trim())}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${r.status}`);
      }
      setResult(await r.json());
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
      <div className="mb-2 text-[11px] uppercase tracking-widest text-zinc-500">
        Find a team’s division
      </div>
      <form onSubmit={go} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Team number, e.g. 10W, 47874J"
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!q.trim() || busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {result && !('found' in result && result.found) && (
        <p className="mt-3 text-sm text-zinc-400">
          No division found. The team may not be registered for Worlds yet.
        </p>
      )}

      {result && 'found' in result && result.found && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="font-mono text-lg font-bold text-white">
                {result.team.team_number}
              </span>{' '}
              <span className="text-sm text-zinc-400">→</span>{' '}
              <span className="text-base font-semibold text-white">
                {result.division_name} Division
              </span>
            </div>
            <span
              className={
                'rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest ' +
                (result.is_predicted
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-emerald-500/20 text-emerald-300')
              }
            >
              {result.is_predicted ? 'Predicted' : 'Official'}
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-400">
            {result.division_stats.total} teams in this division
          </div>
          {result.top_teams.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.top_teams
                .filter((t) => t.team_number !== result.team.team_number)
                .slice(0, 12)
                .map((t) => (
                  <span
                    key={t.team_number}
                    className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-300"
                  >
                    {t.team_number}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
