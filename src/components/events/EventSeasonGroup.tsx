'use client';

import { SeasonBlock } from '@/lib/match-sorter';
import { EventCard } from './EventCard';

export function EventSeasonGroup({
  block,
  teamId,
  defaultOpenFirstEvent = false,
}: {
  block: SeasonBlock;
  teamId: number;
  defaultOpenFirstEvent?: boolean;
}) {
  const totalMatches = block.events.reduce((acc, e) => acc + e.matches.length, 0);
  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {block.season.years}: {block.season.game}
          </h2>
          <p className="text-xs text-zinc-500">
            {block.events.length} event{block.events.length === 1 ? '' : 's'} ·{' '}
            {totalMatches} match{totalMatches === 1 ? '' : 'es'}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          season {block.season.id}
        </span>
      </header>

      <div className="space-y-3">
        {block.events.map((ev, i) => (
          <EventCard
            key={ev.event.id}
            block={ev}
            teamId={teamId}
            defaultOpen={defaultOpenFirstEvent && i === 0}
          />
        ))}
      </div>
    </section>
  );
}
