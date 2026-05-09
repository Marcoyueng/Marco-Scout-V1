import { NextRequest, NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = parseInt(params.id);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];

    const empty = { data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 } };

    const [event, teams, matches, rankings, skills, awards] = await Promise.all([
      robotevents.getEvent(eventId),
      include.includes('teams') ? robotevents.getEventTeams(eventId, { per_page: 250 }).catch(() => empty) : Promise.resolve(empty),
      include.includes('matches') ? robotevents.getEventMatches(eventId, { per_page: 250 }).catch(() => empty) : Promise.resolve(empty),
      include.includes('rankings') ? robotevents.getEventRankings(eventId, { per_page: 250 }).catch(() => empty) : Promise.resolve(empty),
      include.includes('skills') ? robotevents.getEventSkills(eventId, { per_page: 250 }).catch(() => empty) : Promise.resolve(empty),
      include.includes('awards') ? robotevents.getEventAwards(eventId, { per_page: 250 }).catch(() => empty) : Promise.resolve(empty),
    ]);

    const result = {
      event,
      teams: teams.data || [],
      matches: matches.data || [],
      rankings: rankings.data || [],
      skills: skills.data || [],
      awards: awards.data || [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event data' },
      { status: 500 }
    );
  }
}
