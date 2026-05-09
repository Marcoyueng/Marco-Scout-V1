import { NextResponse } from 'next/server';
import { robotevents } from '@/lib/robotevents';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const list = await cached('power:countries:v1', 3600, async () => {
      // Pull a wide slice of teams in the active V5RC season and unique their
      // country values. Mirrors the BALLBALL `/api/power/countries` route which
      // returns the country list available in the power dataset.
      const teams = await robotevents.pagedAll(
        'teams?program[]=V5RC&registered=true',
        4,
        250
      );
      const set = new Set<string>();
      for (const t of teams as any[]) {
        const c = (t.location?.country || '').trim();
        if (c) set.add(c);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    });
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}
