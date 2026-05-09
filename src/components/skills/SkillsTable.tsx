'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { RankedTeamSkills } from '@/utilities/skills-ranking';

export interface SkillsTableProps {
  rows: RankedTeamSkills[];
  loading: boolean;
  startRank?: number;
}

export function SkillsTable({ rows, loading, startRank = 1 }: SkillsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950">
      <table className="min-w-[1100px] w-full text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-950 backdrop-blur">
          <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
            <Th align="right">Rank</Th>
            <Th align="right">Total</Th>
            <Th align="right">Driver</Th>
            <Th align="right">Programming</Th>
            <Th>Team</Th>
            <Th>Name</Th>
            <Th>Organization</Th>
            <Th>Region</Th>
            <Th>Country</Th>
            <Th>Driver event</Th>
            <Th>Programming event</Th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 14 }).map((_, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td colSpan={11} className="px-4 py-2.5">
                    <div className="h-4 animate-pulse rounded bg-white/5" />
                  </td>
                </tr>
              ))
            : rows.length === 0
            ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-sm text-zinc-500"
                  >
                    No teams match your filters.
                  </td>
                </tr>
              )
            : rows.map((r, i) => (
                <tr
                  key={r.team.id}
                  className="border-t border-white/5 transition-colors hover:bg-white/5"
                >
                  <Td align="right" mono>
                    #{startRank + i}
                  </Td>
                  <Td align="right" mono className="font-bold text-white">
                    {r.totalScore}
                  </Td>
                  <Td align="right" mono>
                    {r.driverScore}
                  </Td>
                  <Td align="right" mono>
                    {r.programmingScore}
                  </Td>
                  <Td>
                    <Link
                      href={`/teams/${r.team.id}`}
                      className="inline-flex items-center gap-1 font-mono font-semibold text-white hover:text-zinc-300"
                    >
                      {r.team.number}
                      <ExternalLink className="h-3 w-3 text-zinc-600" />
                    </Link>
                  </Td>
                  <Td>{r.team.name || '—'}</Td>
                  <Td className="max-w-[260px] truncate" title={r.team.organization}>
                    {r.team.organization || '—'}
                  </Td>
                  <Td>{r.team.location.region || '—'}</Td>
                  <Td>{r.team.location.country || '—'}</Td>
                  <Td>
                    {r.driverEvent ? (
                      <EventCell ev={r.driverEvent} />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </Td>
                  <Td>
                    {r.programmingEvent ? (
                      <EventCell ev={r.programmingEvent} />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </Td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

function EventCell({
  ev,
}: {
  ev: { id: number; name: string; date: string | null };
}) {
  return (
    <Link
      href={`/events/${ev.id}`}
      className="block max-w-[280px] truncate text-xs text-zinc-300 hover:text-white"
      title={ev.name}
    >
      <span className="truncate">{ev.name}</span>
      {ev.date && (
        <span className="ml-1 font-mono text-[10px] text-zinc-500">{ev.date}</span>
      )}
    </Link>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={
        'px-3 py-2.5 font-medium ' +
        (align === 'right' ? 'text-right' : 'text-left')
      }
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  mono,
  className,
  title,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  mono?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={
        'px-3 py-2 align-middle ' +
        (mono ? 'font-mono ' : '') +
        (align === 'right' ? 'text-right ' : '') +
        (className ? className + ' ' : '') +
        'text-zinc-200'
      }
    >
      {children}
    </td>
  );
}
