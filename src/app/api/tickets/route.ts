import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

type SessionUser = {
  id?: string;
  nom?: string | null;
  prenom?: string | null;
  role?: string;
  site_id?: number | null;
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
              'user_id',   ta.user_id,
              'nom',       u.nom,
              'prenom',    u.prenom,
              'email',     u.email,
              'assigne_le', ta.assigne_le
            ) ORDER BY ta.assigne_le
          ) FILTER (WHERE ta.user_id IS NOT NULL),
          '[]'::json
        ) AS assignes
      FROM tickets t
      LEFT JOIN ticket_assignations ta ON ta.ticket_id = t.id
      LEFT JOIN users u ON u.id = ta.user_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('[tickets GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
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

    const user = session.user as SessionUser;
    const cree_par = Number(user.id);
    const auteur = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || (session.user?.email ?? 'Inconnu');

    const result = await sql`
      INSERT INTO tickets (titre, description, statut, priorite, cree_par, site)
      VALUES (
        ${titre},
        ${description ?? null},
        'ouvert',
        ${priorite},
        ${cree_par},
        ${site}
      )
      RETURNING *
    `;

    const ticket = result[0];

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

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('[tickets POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
