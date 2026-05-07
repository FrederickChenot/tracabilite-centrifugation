import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    await sql`CREATE TABLE IF NOT EXISTS laboratoires_dest (
      id SERIAL PRIMARY KEY,
      nom VARCHAR(100) UNIQUE NOT NULL,
      email_reception VARCHAR(100),
      actif BOOLEAN DEFAULT true
    )`;
    const rows = await sql`SELECT id, nom, email_reception FROM laboratoires_dest WHERE actif = true ORDER BY nom`;
    return NextResponse.json({ laboratoires: rows });
  } catch (err) {
    console.error('[GET /api/transport/laboratoires]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
