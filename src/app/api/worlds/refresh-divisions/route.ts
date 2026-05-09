import { NextResponse } from 'next/server';
import { refreshDivisionsFromAPI } from '@/lib/worlds';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await refreshDivisionsFromAPI();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
