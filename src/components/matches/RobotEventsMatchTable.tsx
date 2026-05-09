'use client';

import Link from 'next/link';
import { Match } from '@/types/robotevents';
import { matchLabel } from '@/lib/match-sorter';

interface Props {
  matches: Match[];
  /** ID of the team this page is about; bolded/glowing in the alliance cells. */
  highlightTeamId: number;
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function AllianceCell({
  teams,
  side,
  isWinner,
  highlightTeamId,
}: {
  teams: { team: { id?: number; team?: string; number?: string; name?: string } }[];
  side: 'red' | 'blue';
  isWinner: boolean;
  highlightTeamId: number;
}) {
  const tint =
    side === 'red'
      ? 'bg-red-500/10 border-l-2 border-red-500/60'
      : 'bg-blue-500/10 border-r-2 border-blue-500/60';
  const winnerOutline = isWinner ? 'ring-1 ring-white/40' : '';
  return (
    <div className={`flex flex-wrap items-center gap-1 px-3 py-2 ${tint} ${winnerOutline}`}>
      {teams.length === 0 ? (
        <span className="text-xs text-zinc-600">—</span>
      ) : (
        teams.map((t, i) => {
          const number = t.team?.team || t.team?.number || t.team?.name || '';
          const isMe = t.team?.id === highlightTeamId;
          return (
            <Link
              key={`${t.team?.id || number}-${i}`}
              href={t.team?.id ? `/teams/${t.team.id}` : '#'}
              className={`rounded px-2 py-0.5 font-mono text-xs transition-colors ${
                isMe
                  ? 'bg-white text-black font-bold shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'text-zinc-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {number}
            </Link>
          );
        })
      )}
    </div>
  );
}

export function RobotEventsMatchTable({ matches, highlightTeamId }: Props) {
  if (!matches.length) {
    return (
      <div className="px-4 py-6 text-center text-xs text-zinc-500">
        No matches recorded.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
          <tr className="text-[10px] uppercase tracking-widest text-zinc-500">
            <th className="px-3 py-2 text-left font-medium w-[14%]">Match</th>
            <th className="px-3 py-2 text-left font-medium w-[14%]">Time</th>
            <th className="px-3 py-2 text-right font-medium w-[28%]">Red Alliance</th>
            <th className="px-3 py-2 text-center font-medium w-[16%]">Score</th>
            <th className="px-3 py-2 text-left font-medium w-[28%]">Blue Alliance</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const redWon = m.winner === 'red';
            const blueWon = m.winner === 'blue';
            const tie = m.winner === 'tie';
            return (
              <tr key={m.id} className="border-t border-white/5 align-middle">
                <td className="px-3 py-1 text-zinc-300">
                  <div className="font-medium">{matchLabel(m)}</div>
                  {m.division_name && (
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                      {m.division_name}
                    </div>
                  )}
                </td>
                <td className="px-3 py-1 text-xs text-zinc-500">
                  {formatTime(m.scheduled || m.started)}
                </td>
                <td className="p-1">
                  <div className="flex justify-end">
                    <AllianceCell
                      teams={m.alliance_red.teams}
                      side="red"
                      isWinner={redWon}
                      highlightTeamId={highlightTeamId}
                    />
                  </div>
                </td>
                <td className="px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-2 font-mono text-base font-bold">
                    <span
                      className={
                        redWon
                          ? 'text-white'
                          : tie
                          ? 'text-zinc-400'
                          : 'text-zinc-600'
                      }
                    >
                      {m.scored ? m.score_red : '—'}
                    </span>
                    <span className="text-zinc-700">·</span>
                    <span
                      className={
                        blueWon
                          ? 'text-white'
                          : tie
                          ? 'text-zinc-400'
                          : 'text-zinc-600'
                      }
                    >
                      {m.scored ? m.score_blue : '—'}
                    </span>
                  </div>
                  {!m.scored && (
                    <div className="text-[10px] uppercase tracking-wider text-zinc-700">
                      Scheduled
                    </div>
                  )}
                </td>
                <td className="p-1">
                  <AllianceCell
                    teams={m.alliance_blue.teams}
                    side="blue"
                    isWinner={blueWon}
                    highlightTeamId={highlightTeamId}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
