import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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
    SET closed_at = NULL, statut = 'ouverte'
    WHERE id = ${id} AND statut = 'cloturee'
    RETURNING id, statut
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Session introuvable ou non clôturée' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}
