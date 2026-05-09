import { NextRequest, NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const eventId = parseInt(id);

  if (Number.isNaN(eventId)) {
    return NextResponse.json(
      { error: 'Invalid event id' },
      { status: 400 }
    );
  }

  try {
    const data = await cached(`event:preview:v1:${eventId}`, 600, async () => {
      const [event, teams] = await Promise.all([
        robotevents.getEvent(eventId),
        robotevents.pagedAll(`events/${eventId}/teams`, 8, 250),
      ]);

      const registered = (teams as any[]).map((t: any) => ({
        team_id: t.id,
        team_number: t.number || t.team || '',
        team_name: t.team_name || t.name || '',
        organization: t.organization || '',
        city: t.location?.city || '',
        region: t.location?.region || '',
        country: t.location?.country || '',
        grade: t.grade || '',
      }));

      registered.sort((a, b) =>
        (a.team_number || '').localeCompare(
          b.team_number || '',
          undefined,
          {
            numeric: true,
          }
        )
      );

      const countries: Record<string, number> = {};

      for (const t of registered) {
        const c = t.country || 'Unknown';
        countries[c] = (countries[c] || 0) + 1;
      }

      return {
        event,
        registered_teams: registered,
        total_teams: registered.length,
        country_breakdown: countries,
      };
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'Preview failed',
        message: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}
