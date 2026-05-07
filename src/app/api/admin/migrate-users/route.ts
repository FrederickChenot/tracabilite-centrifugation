import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nom VARCHAR(50),
      prenom VARCHAR(50),
      site_id INT REFERENCES sites(id),
      role VARCHAR(10) DEFAULT 'technicien' CHECK (role IN ('technicien','admin')),
      actif BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  return NextResponse.json({ ok: true, message: 'Table users créée ou déjà existante' });
}
