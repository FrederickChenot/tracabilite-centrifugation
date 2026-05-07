import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await sql`
    SELECT id, cle, valeur, description, updated_at, updated_by
    FROM config
    ORDER BY cle
  `;
  return NextResponse.json({ configs: rows });
}
