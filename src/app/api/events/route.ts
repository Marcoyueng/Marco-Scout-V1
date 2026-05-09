import { NextRequest, NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const filters = {
    query: searchParams.get('search') || undefined,
    program: searchParams.get('program') || undefined,
    season: searchParams.get('season') || undefined,
    region: searchParams.get('region') || undefined,
    country: searchParams.get('country') || undefined,
    event_type: searchParams.get('event_type') || undefined,
    level: searchParams.get('level') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    per_page: parseInt(searchParams.get('per_page') || '20'),
  };

  try {
    const result = await robotevents.getEvents(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API /events Error:', error);
    console.error('Filters used:', filters);
    return NextResponse.json(
      {
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
