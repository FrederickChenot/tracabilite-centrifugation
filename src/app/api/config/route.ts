import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await sql`
      SELECT cle, valeur FROM config
      WHERE cle IN ('session_timeout_minutes', 'session_warning_minutes')
    `;
    const result: Record<string, string> = {
      session_timeout_minutes: '30',
      session_warning_minutes: '2',
    };
    for (const row of rows) {
      result[row.cle as string] = row.valeur as string;
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      session_timeout_minutes: '30',
      session_warning_minutes: '2',
    });
  }
}
