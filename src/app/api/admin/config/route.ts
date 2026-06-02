import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rows = await sql`
      SELECT cle, valeur, description, updated_at
      FROM config
      ORDER BY cle
    `;
    return NextResponse.json({ configs: rows });
  } catch (err) {
    console.error('[GET /api/admin/config]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { cle, valeur } = body as { cle?: string; valeur?: string };

    if (!cle || valeur === undefined) {
      return NextResponse.json({ error: 'cle et valeur requis' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO config (cle, valeur, updated_at)
      VALUES (${cle}, ${String(valeur)}, NOW())
      ON CONFLICT (cle) DO UPDATE
        SET valeur = EXCLUDED.valeur, updated_at = NOW()
      RETURNING cle, valeur
    `;

    return NextResponse.json({ success: true, cle: rows[0].cle, valeur: rows[0].valeur });
  } catch (err) {
    console.error('[PATCH /api/admin/config]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
