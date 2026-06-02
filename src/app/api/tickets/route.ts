import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

type PgError = {
  message?: string;
  code?: string;
  detail?: string;
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
        ) AS assignes,
        (
          SELECT COUNT(*)::int
          FROM ticket_historique th
          WHERE th.ticket_id = t.id
            AND th.action = 'commentaire'
        ) AS commentaires_count,
        uc.prenom AS createur_prenom,
        uc.nom    AS createur_nom
      FROM tickets t
      LEFT JOIN ticket_assignations ta ON ta.ticket_id = t.id
      LEFT JOIN users u  ON u.id::text  = ta.user_id::text
      LEFT JOIN users uc ON uc.id::text = t.cree_par::text
      GROUP BY t.id, uc.prenom, uc.nom
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
    const { titre, description, priorite, site, echeance } = body as {
      titre?: string;
      description?: string;
      priorite?: string;
      site?: string;
      echeance?: string | null;
    };

    if (!titre || !priorite || !site) {
      return NextResponse.json(
        { error: 'titre, priorite et site sont requis' },
        { status: 400 }
      );
    }

    const userRow = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (!userRow.length) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 });
    }
    const cree_par = userRow[0].id as number;

    const auteur =
      `${session.user.prenom ?? ''} ${session.user.nom ?? ''}`.trim() ||
      (session.user.email ?? 'Inconnu');

    const result = await sql`
      INSERT INTO tickets (titre, description, statut, priorite, cree_par, site, motif_annulation, echeance)
      VALUES (
        ${titre},
        ${description ?? null},
        'a_faire',
        ${priorite},
        ${cree_par},
        ${site},
        ${null},
        ${echeance ?? null}
      )
      RETURNING *
    `;

    const ticket = result[0];

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
      console.error('[tickets POST] historique INSERT échoué (non bloquant):', he.message);
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    const e = error as PgError;
    console.error('[tickets POST] ERREUR:', { message: e.message, code: e.code, detail: e.detail });
    return NextResponse.json(
      { error: 'Erreur serveur', detail: e.message ?? String(error) },
      { status: 500 }
    );
  }
}
