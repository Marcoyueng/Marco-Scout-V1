import { NextResponse } from 'next/server';
import { withAuth, publicUser } from '@/lib/auth';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req, _ctx: object, user) => {
  return NextResponse.json({ user: publicUser(user) });
});
