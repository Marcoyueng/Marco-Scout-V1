'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Building2, GraduationCap, Trophy } from 'lucide-react';
import { EventSeasonGroup } from '@/components/events/EventSeasonGroup';
import { Team, Award } from '@/types/robotevents';
import { SeasonBlock } from '@/lib/match-sorter';
import { FavoriteButton } from '@/components/team/FavoriteButton';
import { NotesEditor } from '@/components/team/NotesEditor';

interface FullPayload {
  team: Team;
  seasonBlocks: SeasonBlock[];
  summary: {
    totalEvents: number;
    totalMatches: number;
    totalAwards: number;
    bestDriverSkills: number | null;
    bestProgrammingSkills: number | null;
    bestTotalSkills: number | null;
    bestSkillsEvent: { id?: number; name?: string } | null;
  };
  awards: Award[];
  skills: any[];
  error?: string;
  message?: string;
}

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold text-white">{value ?? '—'}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function TeamPage() {
  const params = useParams();
  const teamId = parseInt(params?.id as string);
  const [data, setData] = useState<FullPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/teams/${teamId}/full`)
      .then((r) => r.json())
      .then((d: FullPayload) => {
        if (d.error) {
          setError(d.message || d.error);
        } else {
          setData(d);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-zinc-400">{error || 'Team not found.'}</p>
        <Link href="/teams" className="mt-4 inline-block text-sm text-white hover:text-zinc-300">
          ← Back to teams
        </Link>
      </div>
    );
  }

  const { team, seasonBlocks, summary, awards } = data;
  const totalAwardsCount = awards?.length ?? summary.totalAwards;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        href="/teams"
        className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to teams
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            {team.program?.code || 'V5RC'} · {team.grade || ''}
          </div>
          <h1 className="mt-1 flex items-center gap-3 text-4xl font-black tracking-tight text-white">
            <span>{team.team}</span>
            <FavoriteButton team={team.team} />
          </h1>
          <p className="mt-1 text-lg text-zinc-300">{team.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            {team.organization && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                {team.organization}
              </span>
            )}
            {team.location?.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                {team.location.city}
                {team.location.region ? `, ${team.location.region}` : ''}
                {team.location.country ? `, ${team.location.country}` : ''}
              </span>
            )}
            {team.grade && (
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-3 w-3" />
                {team.grade}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary tiles — official skills + counts only. No fake aggregations. */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Best Skills (Total)"
          value={summary.bestTotalSkills ?? '—'}
          sub={summary.bestSkillsEvent?.name?.slice(0, 32)}
        />
        <StatTile label="Best Driver" value={summary.bestDriverSkills ?? '—'} />
        <StatTile label="Best Programming" value={summary.bestProgrammingSkills ?? '—'} />
        <StatTile
          label="Events / Matches"
          value={`${summary.totalEvents} / ${summary.totalMatches}`}
        />
      </div>

      {/* Awards */}
      {totalAwardsCount > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-zinc-300" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
              Awards ({totalAwardsCount})
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {awards.slice(0, 12).map((a) => (
              <li key={a.id} className="text-sm text-zinc-200">
                <span className="text-white">{a.title}</span>
                {a.event?.name && (
                  <span className="text-zinc-500"> · {a.event.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Personal scouting notes */}
      <div className="mt-6">
        <NotesEditor team={team.team} />
      </div>

      {/* Season-grouped events */}
      <div className="mt-10 space-y-10">
        {seasonBlocks.length === 0 ? (
          <p className="text-sm text-zinc-500">No event history available.</p>
        ) : (
          seasonBlocks.map((block, idx) => (
            <EventSeasonGroup
              key={block.season.id}
              block={block}
              teamId={teamId}
              defaultOpenFirstEvent={idx === 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
