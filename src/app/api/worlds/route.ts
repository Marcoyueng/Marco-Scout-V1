import { NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';
import { cached } from '@/lib/cache';
import { WORLDS_EVENT, CURRENT_SEASON } from '@/lib/constants';

export const revalidate = 3600;

export async function GET() {
  try {
    const data = await cached('worlds:v1', 3600, async () => {
      const [event, teams] = await Promise.all([
        robotevents.getEvent(WORLDS_EVENT.id),
        robotevents.getEventTeams(WORLDS_EVENT.id, { per_page: 500 }),
      ]);

      const countries: Record<string, number> = {};
      teams.data.forEach((t: any) => {
        const c = t.location?.country || 'Unknown';
        countries[c] = (countries[c] || 0) + 1;
      });
      const countryList = Object.entries(countries)
        .sort((a, b) => b[1] - a[1])
        .map(([country, count]) => ({ country, count }));

      // Synthetic divisions based on Ballball Tech style. Real divisions
      // can be pulled from event.divisions, but the public API does not
      // expose roster per division reliably for upcoming events.
      const totalTeams = teams.data.length;
      const eventDivisions = (event as any)?.divisions || [];
      const divisionNames =
        eventDivisions.length > 0
          ? eventDivisions.map((d: any) => d.name)
          : ['Arts', 'Design', 'Engineering', 'Innovation', 'Math', 'Opportunity', 'Research', 'Science', 'Spirit', 'Technology'];

      const perDiv = Math.floor(totalTeams / divisionNames.length);
      const divisions = divisionNames.map((name: string, i: number) => ({
        name,
        teams: i < totalTeams % divisionNames.length ? perDiv + 1 : perDiv,
        avgPower: 0,
      }));

      return {
        event,
        season: CURRENT_SEASON,
        registered: totalTeams,
        qualified: Math.max(866, totalTeams),
        countries: countryList.length,
        divisions,
        countryBreakdown: countryList,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('worlds error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load worlds' },
      { status: 500 }
    );
  }
}
