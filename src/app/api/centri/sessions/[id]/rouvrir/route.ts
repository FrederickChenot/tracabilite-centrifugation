import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const hasLabo = request.cookies.get('labo_access')?.value === 'true';
  if (!session && !hasLabo) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;

  const sessionRows = await sql`
    SELECT id, statut, closed_at FROM sessions_centri
    WHERE id = ${id} AND statut = 'cloturee'
    LIMIT 1
  `;

  if (sessionRows.length === 0) {
    return NextResponse.json({ error: 'Session introuvable ou non clôturée' }, { status: 404 });
  }

  const closedAt = new Date(sessionRows[0].closed_at as string);
  const diffMinutes = (Date.now() - closedAt.getTime()) / 60000;
  if (diffMinutes > 5) {
    return NextResponse.json({ error: 'Réouverture impossible après 5 minutes' }, { status: 403 });
  }

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
