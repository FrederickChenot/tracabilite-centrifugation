import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

type PgError = {
  message?: string;
  code?: string;
  detail?: string;
  hint?: string;
  where?: string;
};

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const tickets = await sql`
      SELECT
        t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'user_id',    ta.user_id,
              'nom',        u.nom,
              'prenom',     u.prenom,
              'email',      u.email,
              'assigne_le', ta.assigne_le
            ) ORDER BY ta.assigne_le
          ) FILTER (WHERE ta.user_id IS NOT NULL),
          '[]'::json
        ) AS assignes
      FROM tickets t
      LEFT JOIN ticket_assignations ta ON ta.ticket_id = t.id
      LEFT JOIN users u ON u.id::text = ta.user_id::text
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    return NextResponse.json({ tickets });
  } catch (error) {
    const e = error as PgError;
    console.error('[tickets GET] ERREUR:', { message: e.message, code: e.code, detail: e.detail });
    return NextResponse.json({ error: 'Erreur serveur', detail: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { titre, description, priorite, site } = body as {
      titre?: string;
      description?: string;
      priorite?: string;
      site?: string;
    };

    if (!titre || !priorite || !site) {
      return NextResponse.json(
        { error: 'titre, priorite et site sont requis' },
        { status: 400 }
      );
    }

    const cree_par = session.user.id as number;
    const auteur =
      `${session.user.nom ?? ''} ${session.user.prenom ?? ''}`.trim() ||
      (session.user.email ?? 'Inconnu');

    console.log('[tickets POST] session.user.id:', cree_par);

    const result = await sql`
      INSERT INTO tickets (titre, description, statut, priorite, cree_par, site, motif_annulation)
      VALUES (
        ${titre},
        ${description ?? null},
        'a_faire',
        ${priorite},
        ${cree_par},
        ${site},
        ${null}
      )
      RETURNING *
    `;

    const ticket = result[0];

    // Historique non bloquant
    try {
      await sql`
        INSERT INTO ticket_historique (id, ticket_id, user_id, action, commentaire)
        VALUES (
          gen_random_uuid(),
          ${ticket.id as string},
          ${cree_par},
          'creation',
          ${`Ticket créé par ${auteur}`}
        )
      `;
    } catch (histErr) {
      const he = histErr as PgError;
      console.error('[tickets POST] historique INSERT échoué (non bloquant):', {
        message: he.message,
        code: he.code,
        detail: he.detail,
      });
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    const e = error as PgError;
    console.error('[tickets POST] ERREUR COMPLÈTE:', {
      message: e.message,
      code:    e.code,
      detail:  e.detail,
      hint:    e.hint,
      where:   e.where,
      raw:     String(error),
    });
    return NextResponse.json(
      { error: 'Erreur serveur', detail: e.message ?? String(error) },
      { status: 500 }
    );
  }
}
