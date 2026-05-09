import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// V5RC event levels per RobotEvents API.
const LEVELS = [
  'Signature',
  'World',
  'National',
  'Regional',
  'State',
  'Other',
];

export async function GET() {
  return NextResponse.json(LEVELS);
}
