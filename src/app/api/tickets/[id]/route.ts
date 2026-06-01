import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

type SessionUser = {
  id?: string;
  nom?: string | null;
  prenom?: string | null;
  role?: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const ticketResult = await sql`
      SELECT
        t.*,
        COALESCE(
          json_agg(DISTINCT
            json_build_object(
              'user_id',    ta.user_id,
              'nom',        u.nom,
              'prenom',     u.prenom,
              'email',      u.email,
              'assigne_le', ta.assigne_le
            )
          ) FILTER (WHERE ta.user_id IS NOT NULL),
          '[]'::json
        ) AS assignes
      FROM tickets t
      LEFT JOIN ticket_assignations ta ON ta.ticket_id = t.id
      LEFT JOIN users u ON u.id = ta.user_id
      WHERE t.id = ${id}
      GROUP BY t.id
    `;

    if (ticketResult.length === 0) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const historique = await sql`
      SELECT
        th.*,
        u.nom,
        u.prenom,
        u.email
      FROM ticket_historique th
      LEFT JOIN users u ON u.id = th.user_id
      WHERE th.ticket_id = ${id}
      ORDER BY th.created_at ASC
    `;

    return NextResponse.json({ ticket: ticketResult[0], historique });
  } catch (error) {
    console.error('[tickets/[id] GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
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
    const { statut, priorite } = body as { statut?: string; priorite?: string };

    if (!statut && !priorite) {
      return NextResponse.json(
        { error: 'Au moins statut ou priorite est requis' },
        { status: 400 }
      );
    }

    const user = session.user as SessionUser;
    const user_id = Number(user.id);

    const current = await sql`
      SELECT statut, priorite FROM tickets WHERE id = ${id}
    `;
    if (current.length === 0) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const updated = await sql`
      UPDATE tickets
      SET
        statut     = COALESCE(${statut ?? null}, statut),
        priorite   = COALESCE(${priorite ?? null}, priorite),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (statut && statut !== current[0].statut) {
      await sql`
        INSERT INTO ticket_historique (id, ticket_id, user_id, action, ancienne_valeur, nouvelle_valeur)
        VALUES (
          gen_random_uuid(),
          ${id},
          ${user_id},
          'changement_statut',
          ${current[0].statut as string},
          ${statut}
        )
      `;
    }

    if (priorite && priorite !== current[0].priorite) {
      await sql`
        INSERT INTO ticket_historique (id, ticket_id, user_id, action, ancienne_valeur, nouvelle_valeur)
        VALUES (
          gen_random_uuid(),
          ${id},
          ${user_id},
          'changement_priorite',
          ${current[0].priorite as string},
          ${priorite}
        )
      `;
    }

    return NextResponse.json({ ticket: updated[0] });
  } catch (error) {
    console.error('[tickets/[id] PUT]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
