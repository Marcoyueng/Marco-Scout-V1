'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { rankBucket } from '@/lib/powerRating';

interface PowerTeam {
  rank: number;
  team: { id: number; number: string; name: string; organization: string; location: string };
  rating: number;
  driverSkills: number;
  programmingSkills: number;
  combinedSkills: number;
  wins: number;
  losses: number;
  ties: number;
  events: number;
}

export default function PowerPage() {
  const [teams, setTeams] = useState<PowerTeam[] | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/power?limit=100')
      .then((r) => r.json())
      .then((d) => setTeams(d.teams || []))
      .catch(() => setTeams([]));
  }, []);

  const filtered = (teams || []).filter((t) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      t.team.number.toLowerCase().includes(q) ||
      t.team.name.toLowerCase().includes(q) ||
      t.team.location.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight">POWER RANKINGS</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Marco Scout Power Rating (MSPR) blends skills score, win rate and event activity into a
            single 0–100 metric. Updated every 6 hours.
          </p>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by team number, name, or location…"
            className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none"
          />
          <span className="text-xs text-zinc-500">
            {teams === null ? 'Loading…' : `${filtered.length} teams`}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
                <th className="px-4 py-3 text-left font-medium">Power #</th>
                <th className="px-4 py-3 text-left font-medium">Team</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-right font-medium">Rating</th>
                <th className="px-4 py-3 text-right font-medium">Skills</th>
                <th className="px-4 py-3 text-right font-medium">W-L-T</th>
                <th className="px-4 py-3 text-right font-medium">Events</th>
              </tr>
            </thead>
            <tbody>
              {teams === null
                ? Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-white/10" />
                      </td>
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                        No teams match.
                      </td>
                    </tr>
                  )
                : filtered.map((t) => {
                    const bucket = rankBucket(t.rating);
                    return (
                      <tr
                        key={t.team.id}
                        className="border-t border-white/5 transition-colors hover:bg-white/5"
                      >
                        <td className="px-4 py-3 text-zinc-500">#{t.rank}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/teams/${t.team.id}`}
                            className="font-mono font-semibold text-white hover:text-zinc-300"
                          >
                            {t.team.number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-zinc-200">{t.team.name}</td>
                        <td className="px-4 py-3 text-zinc-500">{t.team.location}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${bucket.color}`}>
                          {t.rating.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">
                          {t.combinedSkills}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-400">
                          {t.wins}-{t.losses}-{t.ties}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-400">{t.events}</td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
