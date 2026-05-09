import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const VERIFY_FROM_EMAIL = process.env.VERIFY_FROM_EMAIL || 'noreply@example.com';

export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => ({}));
  const email = String(data.email || '').trim().toLowerCase();
  if (!email || !email.includes('@'))
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const conn = db();
  const existing = conn.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing)
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

  // Rate limit: 1 code per 60s per email.
  const recent = conn
    .prepare(
      `SELECT id FROM email_verify_codes
       WHERE email = ? AND used = 0
         AND created_at >= datetime('now', '-1 minute')`
    )
    .get(email);
  if (recent)
    return NextResponse.json(
      { error: 'Please wait 60 seconds before requesting another code' },
      { status: 429 }
    );

  const code = String(100000 + (crypto.randomInt(0, 900000)));
  conn
    .prepare('INSERT INTO email_verify_codes (email, code) VALUES (?, ?)')
    .run(email, code);

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: VERIFY_FROM_EMAIL,
        to: [email],
        subject: 'Marco Scout — Verification Code',
        html: `<h2>Your verification code</h2><p style="font-size:32px;letter-spacing:8px;font-weight:bold">${code}</p><p>This code expires in 10 minutes.</p>`,
      }),
    });
    if (!r.ok)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
