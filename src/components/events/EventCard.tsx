'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { EventBlock, computeRecord } from '@/lib/match-sorter';
import { RobotEventsMatchTable } from '@/components/matches/RobotEventsMatchTable';

function fmtDateRange(start?: string, end?: string): string {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (!e || s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString(undefined, opts);
  }
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, opts)}`;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-mono text-base font-semibold text-white">{value}</span>
    </div>
  );
}

export function EventCard({
  block,
  teamId,
  defaultOpen = false,
}: {
  block: EventBlock;
  teamId: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ev = block.event;
  const ranking = block.ranking;
  const skills = block.skills;

  // Derive a real record from the matches actually fetched for this team.
  const record = computeRecord(block.matches, teamId);
  const wlt =
    ranking
      ? `${ranking.wins}-${ranking.losses}-${ranking.ties}`
      : record.played > 0
      ? `${record.wins}-${record.losses}-${record.ties}`
      : '—';

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="mt-1 text-zinc-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={`/events/${ev.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-base font-semibold text-white hover:text-zinc-300"
            >
              {ev.name}
            </Link>
            {ev.code && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                {ev.code}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            {(ev.start || ev.end) && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {fmtDateRange(ev.start, ev.end)}
              </span>
            )}
            {ev.location?.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {ev.location.city}
                {ev.location.region ? `, ${ev.location.region}` : ''}
              </span>
            )}
            <span>{block.matches.length} matches</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Rank" value={ranking?.rank ?? '—'} />
          <Stat label="W-L-T" value={wlt} />
          <Stat label="WP" value={ranking?.wp ?? '—'} />
          <Stat label="AP" value={ranking?.ap ?? '—'} />
          <Stat label="SP" value={ranking?.sp ?? '—'} />
          <Stat
            label="Skills"
            value={skills?.total != null ? skills.total : '—'}
          />
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-white/10">
          {skills && (skills.driver || skills.programming) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-white/5 bg-white/[0.02] px-4 py-2 text-xs text-zinc-400">
              <span>
                Driver:{' '}
                <span className="font-mono font-semibold text-white">
                  {skills.driver?.score ?? '—'}
                </span>
              </span>
              <span>
                Programming:{' '}
                <span className="font-mono font-semibold text-white">
                  {skills.programming?.score ?? '—'}
                </span>
              </span>
              {skills.driver?.rank && (
                <span className="text-zinc-500">Driver rank #{skills.driver.rank}</span>
              )}
              {skills.programming?.rank && (
                <span className="text-zinc-500">Prog rank #{skills.programming.rank}</span>
              )}
            </div>
          )}

          <RobotEventsMatchTable matches={block.matches} highlightTeamId={teamId} />

          {block.awards && block.awards.length > 0 && (
            <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Awards</div>
              <ul className="mt-1 space-y-0.5">
                {block.awards.map((a) => (
                  <li key={a.id} className="text-sm text-zinc-200">
                    {a.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
