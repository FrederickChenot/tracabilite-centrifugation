import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS laboratoires_dest (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    email_reception VARCHAR(100),
    actif BOOLEAN DEFAULT true
  )`;
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await ensureTable();
    const rows = await sql`SELECT * FROM laboratoires_dest ORDER BY nom`;
    return NextResponse.json({ laboratoires: rows });
  } catch (err) {
    console.error('[GET /api/admin/laboratoires]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    await ensureTable();
    const body = await request.json();
    const { nom, email_reception } = body as { nom: string; email_reception?: string };
    if (!nom?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    const result = await sql`
      INSERT INTO laboratoires_dest (nom, email_reception)
      VALUES (${nom.trim()}, ${email_reception?.trim() ?? null})
      RETURNING *
    `;
    return NextResponse.json({ success: true, laboratoire: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/laboratoires]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
