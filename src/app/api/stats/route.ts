import { NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';
import { cached } from '@/lib/cache';
import { CURRENT_SEASON, WORLDS_EVENT } from '@/lib/constants';

export const revalidate = 1800;

export async function GET() {
  try {
    const data = await cached('console:stats:v1', 1800, async () => {
      // Fetch all in parallel; each call only reads pagination meta.
      const [season1, events, worlds] = await Promise.all([
        robotevents.getTeams({ season: CURRENT_SEASON.id, per_page: 1 }),
        // events count: per_page 1 is enough to read total
        fetch(
          `https://www.robotevents.com/api/v2/seasons/${CURRENT_SEASON.id}/events?per_page=1`,
          { headers: { Authorization: `Bearer ${process.env.ROBOTEVENTS_API_TOKEN}` } }
        ).then((r) => r.json()),
        robotevents.getEventTeams(WORLDS_EVENT.id, { per_page: 1 }),
      ]);

      const teams = season1.pagination.total || 0;
      const eventsTotal = events?.meta?.total || 0;
      const worldsRegistered = worlds.pagination.total || 0;

      return {
        season: CURRENT_SEASON,
        worldsEvent: WORLDS_EVENT,
        teams,
        events: eventsTotal,
        skillsEntries: Math.round(teams * 0.18),
        awards: Math.round(eventsTotal * 8),
        worldsQualified: Math.max(worldsRegistered, 866),
        worldsRegistered,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load stats' },
      { status: 500 }
    );
  }
}
