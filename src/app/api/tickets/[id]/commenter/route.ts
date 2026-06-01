import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

type SessionUser = {
  id?: string;
  nom?: string | null;
  prenom?: string | null;
};

type PgError = {
  message?: string;
  code?: string;
  detail?: string;
};

function safeUserId(rawId: string | undefined): number {
  const n = parseInt(rawId ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { commentaire } = body as { commentaire?: string };

    if (!commentaire || !commentaire.trim()) {
      return NextResponse.json({ error: 'commentaire requis' }, { status: 400 });
    }

    const ticketExists = await sql`
      SELECT id FROM tickets WHERE id = ${id}
    `;
    if (ticketExists.length === 0) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const user = session.user as SessionUser;
    const user_id = safeUserId(user.id);

    const result = await sql`
      INSERT INTO ticket_historique (id, ticket_id, user_id, action, commentaire)
      VALUES (gen_random_uuid(), ${id}, ${user_id}, 'commentaire', ${commentaire.trim()})
      RETURNING *
    `;

    return NextResponse.json({ historique: result[0] }, { status: 201 });
  } catch (error) {
    const e = error as PgError;
    console.error('[tickets/[id]/commenter POST] ERREUR:', { message: e.message, code: e.code, detail: e.detail });
    return NextResponse.json({ error: 'Erreur serveur', detail: e.message }, { status: 500 });
  }
}
