import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cle: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { cle } = await params;
    const body = await req.json();
    const { valeur } = body as { valeur?: string };

    if (valeur === undefined) {
      return NextResponse.json({ error: 'valeur requis' }, { status: 400 });
    }

    const updatedBy = session.user?.email ?? 'admin';

    const rows = await sql`
      INSERT INTO config (cle, valeur, updated_at, updated_by)
      VALUES (${cle}, ${String(valeur)}, NOW(), ${updatedBy})
      ON CONFLICT (cle) DO UPDATE
        SET valeur = EXCLUDED.valeur, updated_at = NOW(), updated_by = ${updatedBy}
      RETURNING id, cle, valeur, updated_at, updated_by
    `;

    return NextResponse.json({ success: true, cle: rows[0].cle, valeur: rows[0].valeur });
  } catch (err) {
    console.error('[PATCH /api/admin/config/[cle]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
