import { NextRequest, NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      query: searchParams.get('search') || undefined,
      program: searchParams.get('program') || undefined,
      season: searchParams.get('season') || undefined,
      grade: searchParams.get('grade') || undefined,
      region: searchParams.get('region') || undefined,
      country: searchParams.get('country') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      per_page: parseInt(searchParams.get('per_page') || '20'),
    };

    const result = await robotevents.getTeams(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch teams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
