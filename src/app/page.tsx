'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Zap, Users, Search, Scale } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface Stats {
  season: { name: string; short: string };
  worldsEvent: { name: string };
  teams: number;
  events: number;
  skillsEntries: number;
  awards: number;
  worldsQualified: number;
  worldsRegistered: number;
}

interface PowerTeam {
  rank: number;
  team: { id: number; number: string; name: string; location: string };
  rating: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [power, setPower] = useState<PowerTeam[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then(setStats).catch(() => {});
    fetch('/api/power?limit=10')
      .then((r) => r.json())
      .then((d) => setPower(d.teams || []))
      .catch(() => setPower([]));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  const StatCard = ({ value, label }: { value: number | string; label: string }) => (
    <div className="rounded-xl border border-white/10 bg-zinc-950 px-6 py-5">
      <div className="text-3xl font-bold tracking-tight text-white">
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            <span className="text-white">MARCO SCOUT</span>
            <span className="ml-3 text-zinc-500">CONSOLE</span>
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            {stats?.season?.name || 'VEX V5 Robotics Competition · 2025-2026 · Push Back'}
          </p>

          <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search teams (8198X) or events…"
                className="w-full rounded-lg border border-white/10 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Search
            </button>
          </form>
        </div>

        {/* Stat cards */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard value={stats?.teams ?? '—'} label="Teams" />
          <StatCard value={stats?.events ?? '—'} label="Events" />
          <StatCard value={stats?.skillsEntries ?? '—'} label="Skills Entries" />
          <StatCard value={stats?.awards ?? '—'} label="Awards" />
          <StatCard value={stats?.worldsQualified ?? '—'} label="Worlds Qualified" />
          <StatCard value={stats?.worldsRegistered ?? '—'} label="Worlds Registered" />
        </div>

        {/* Power Rankings preview */}
        <div className="mb-10 rounded-xl border border-white/10 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <div className="text-[11px] uppercase tracking-widest text-zinc-500">
              Power Rankings — Top 10
            </div>
            <Link
              href="/power"
              className="text-xs font-semibold text-white hover:text-zinc-300"
            >
              VIEW ALL →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">Team</th>
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Region</th>
                  <th className="px-5 py-3 text-right font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {power === null
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td colSpan={5} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-white/10" />
                        </td>
                      </tr>
                    ))
                  : power.length === 0
                  ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                          Power rankings are still being computed. Try again in a moment.
                        </td>
                      </tr>
                    )
                  : power.map((p) => (
                      <tr
                        key={p.team.id}
                        className="border-t border-white/5 transition-colors hover:bg-white/5"
                      >
                        <td className="px-5 py-3 text-zinc-500">{p.rank}</td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/teams/${p.team.id}`}
                            className="font-mono font-semibold text-white hover:text-zinc-300"
                          >
                            {p.team.number}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-zinc-200">{p.team.name}</td>
                        <td className="px-5 py-3 text-zinc-500">{p.team.location}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-white">
                          {p.rating.toFixed(1)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            href="/skills"
            icon={<Trophy className="h-5 w-5 text-white" />}
            title="Skills World Rankings"
            description="Global robot skills standings with driver and programming scores."
          />
          <ActionCard
            href="/power"
            icon={<Zap className="h-5 w-5 text-white" />}
            title="Power Rankings"
            description="Team strength rating based on skills, win rate and event participation."
          />
          <ActionCard
            href="/weight"
            icon={<Scale className="h-5 w-5 text-white" />}
            title="Weight Calculator"
            description="Calculate VEX V5 robot weight from a part list."
          />
          <ActionCard
            href="/teams"
            icon={<Users className="h-5 w-5 text-white" />}
            title="Team Search"
            description={`Look up any team. See event history, awards and Worlds status.`}
          />
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/10 bg-zinc-950 p-5 transition-colors hover:border-white/30 hover:bg-zinc-900"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-white/10">
        {icon}
      </div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</div>
    </Link>
  );
}
