import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { NextResponse } from 'next/server';

async function ensureConfigTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS config (
      id SERIAL PRIMARY KEY,
      cle VARCHAR(50) UNIQUE NOT NULL,
      valeur TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by VARCHAR(50)
    )
  `;
  await sql`
    INSERT INTO config (cle, valeur, description) VALUES
      ('session_timeout_minutes', '30', 'Durée inactivité avant déconnexion (minutes)'),
      ('session_warning_minutes', '2', 'Délai avertissement avant déconnexion (minutes)')
    ON CONFLICT (cle) DO NOTHING
  `;
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await ensureConfigTable();
    const rows = await sql`
      SELECT id, cle, valeur, description, updated_at, updated_by
      FROM config
      ORDER BY cle
    `;
    return NextResponse.json({ configs: rows });
  } catch (err) {
    console.error('[GET /api/admin/config]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
