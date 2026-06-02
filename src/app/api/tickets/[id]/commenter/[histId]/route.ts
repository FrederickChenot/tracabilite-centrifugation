import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

type PgError = { message?: string; code?: string };

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; histId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { id, histId } = await params;
    const isAdmin = (session.user as { role?: string })?.role === 'admin';

    const userRow = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (!userRow.length) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 });
    }
    const userId = userRow[0].id;

    const entry = await sql`
      SELECT user_id, action
      FROM ticket_historique
      WHERE id = ${histId} AND ticket_id = ${id}
    `;

    if (!entry.length) {
      return NextResponse.json({ error: 'Commentaire introuvable' }, { status: 404 });
    }
    if (entry[0].action !== 'commentaire') {
      return NextResponse.json({ error: 'Cette entrée n\'est pas un commentaire' }, { status: 400 });
    }
    if (!isAdmin && String(entry[0].user_id) !== String(userId)) {
      return NextResponse.json(
        { error: 'Vous ne pouvez supprimer que vos propres commentaires' },
        { status: 403 }
      );
    }

    await sql`DELETE FROM ticket_historique WHERE id = ${histId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    const e = error as PgError;
    console.error('[commenter/[histId] DELETE] ERREUR:', e.message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
