import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as { role?: string; site_id?: number | null };

  const check = await sql`
    SELECT id, site_id FROM sessions_centri
    WHERE id = ${id} AND statut = 'ouverte'
  `;

  if (check.length === 0) {
    return NextResponse.json({ error: 'Session introuvable ou déjà clôturée' }, { status: 404 });
  }

  if (user.role !== 'admin' && user.site_id && user.site_id !== check[0].site_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await sql`DELETE FROM tubes_centri WHERE session_id = ${id}`;
  await sql`DELETE FROM sessions_centri WHERE id = ${id} AND statut = 'ouverte'`;

  return NextResponse.json({ ok: true });
}
