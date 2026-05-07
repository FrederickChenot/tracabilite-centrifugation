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

  const { cle } = await params;
  const body = await req.json();
  const { valeur } = body as { valeur?: string };

  if (valeur === undefined) {
    return NextResponse.json({ error: 'valeur requis' }, { status: 400 });
  }

  const updatedBy = session.user?.email ?? 'admin';

  const rows = await sql`
    UPDATE config
    SET valeur = ${String(valeur)}, updated_at = NOW(), updated_by = ${updatedBy}
    WHERE cle = ${cle}
    RETURNING id, cle, valeur, updated_at, updated_by
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Clé introuvable' }, { status: 404 });
  }

  return NextResponse.json({ config: rows[0] });
}
