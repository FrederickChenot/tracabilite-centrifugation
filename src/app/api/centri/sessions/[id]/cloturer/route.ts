import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await sql`
    UPDATE sessions_centri
    SET closed_at = NOW(), statut = 'cloturee'
    WHERE id = ${id} AND statut = 'ouverte'
    RETURNING id, closed_at, statut
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Session introuvable ou déjà clôturée' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}
