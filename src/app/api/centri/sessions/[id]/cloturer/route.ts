import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import sql from '@/lib/db';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;

  const result = await sql`
    UPDATE sessions_centri
    SET closed_at = NOW(), statut = 'cloturee'
    WHERE id = ${id} AND statut = 'ouverte'
    RETURNING id, closed_at, statut, site_id
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Session introuvable ou déjà clôturée' }, { status: 404 });
  }

  await logAudit(
    session.user?.email ?? null,
    'CLOSE_SESSION',
    'session',
    String(id),
    result[0].site_id as number | undefined
  );

  return NextResponse.json(result[0]);
}
