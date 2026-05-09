'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';
import { WorldsSearch } from '@/components/worlds/WorldsSearch';

interface WorldsData {
  event: any;
  season: { name: string; short: string };
  registered: number;
  qualified: number;
  countries: number;
  divisions: { name: string; teams: number; avgPower: number }[];
  countryBreakdown: { country: string; count: number }[];
}

export default function WorldsPage() {
  const [data, setData] = useState<WorldsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    fetch('/api/worlds', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setRefreshing(false));
  };

  useEffect(load, []);

  const daysUntil = data?.event?.start
    ? Math.max(0, Math.ceil((new Date(data.event.start).getTime() - Date.now()) / 86400000))
    : null;

  const StatCard = ({ value, label }: { value: number | string; label: string }) => (
    <div className="rounded-xl border border-white/10 bg-zinc-950 px-6 py-6 text-center">
      <div className="text-4xl font-bold tracking-tight text-white">
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="flex items-baseline gap-3 text-3xl font-black tracking-tight">
            <span className="italic">WORLD CHAMPIONSHIP</span>
            {daysUntil !== null && (
              <span className="rounded-md bg-zinc-900 px-2 py-1 text-base font-mono text-white">
                {daysUntil} days
              </span>
            )}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {data?.event?.name || data?.season?.name}{' '}
            {data?.event?.start && (
              <>
                · {new Date(data.event.start).toISOString().slice(0, 10)} ·{' '}
                {data?.event?.location?.city}, {data?.event?.location?.region},{' '}
                {data?.event?.location?.country}
              </>
            )}
          </p>
        </div>

        <div className="mb-6">
          <WorldsSearch />
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard value={data?.registered ?? '—'} label="Registered" />
          <StatCard value={data?.qualified ?? '—'} label="Qualified" />
          <StatCard value={data?.countries ?? '—'} label="Countries" />
          <StatCard value={data?.divisions?.length ?? '—'} label="Divisions" />
        </div>

        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-zinc-500">Divisions</div>
            <button
              onClick={load}
              disabled={refreshing}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh from API'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(data?.divisions || []).map((d) => (
              <div
                key={d.name}
                className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-center"
              >
                <div className="text-base font-semibold text-white">{d.name}</div>
                <div className="mt-1 text-xs text-zinc-500">{d.teams} teams</div>
              </div>
            ))}
            {data === null &&
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-white/10" />
              ))}
          </div>
        </div>

        <div>
          <div className="mb-3 text-[11px] uppercase tracking-widest text-zinc-500">
            Registered Teams by Country
          </div>
          <div className="flex flex-wrap gap-2">
            {(data?.countryBreakdown || []).map((c) => (
              <span
                key={c.country}
                className="rounded-md border border-white/10 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300"
              >
                {c.country}: <span className="font-mono font-semibold text-white">{c.count}</span>
              </span>
            ))}
            {data === null && (
              <div className="h-8 w-full animate-pulse rounded bg-white/10" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
