import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

type PgError = {
  message?: string;
  code?: string;
  detail?: string;
  hint?: string;
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
        uc.prenom AS createur_prenom,
        uc.nom    AS createur_nom
      FROM tickets t
      LEFT JOIN ticket_assignations ta ON ta.ticket_id = t.id
      LEFT JOIN users u  ON u.id::text  = ta.user_id::text
      LEFT JOIN users uc ON uc.id::text = t.cree_par::text
      WHERE t.id = ${id}
      GROUP BY t.id, uc.prenom, uc.nom
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
      LEFT JOIN users u ON u.id::text = th.user_id::text
      WHERE th.ticket_id = ${id}
      ORDER BY th.created_at ASC
    `;

    return NextResponse.json({ ticket: ticketResult[0], historique });
  } catch (error) {
    const e = error as PgError;
    console.error('[tickets/[id] GET] ERREUR:', { message: e.message, code: e.code, detail: e.detail });
    return NextResponse.json({ error: 'Erreur serveur', detail: e.message }, { status: 500 });
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
    const body = await request.json() as Record<string, unknown>;

    const statut      = body.statut      as string | undefined;
    const priorite    = body.priorite    as string | undefined;
    const description = body.description as string | undefined;
    const echeanceInBody = 'echeance' in body;
    const echeance    = echeanceInBody ? (body.echeance as string | null ?? null) : undefined;
    const checklistInBody = 'checklist' in body;
    const checklist   = checklistInBody ? body.checklist : undefined;

    const hasChanges = statut || priorite || description !== undefined || echeanceInBody || checklistInBody;
    if (!hasChanges) {
      return NextResponse.json(
        { error: 'Au moins un champ à modifier est requis' },
        { status: 400 }
      );
    }

    const userRow = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (!userRow.length) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 });
    }
    const userId = userRow[0].id as number;

    const current = await sql`
      SELECT statut, priorite, echeance FROM tickets WHERE id = ${id}
    `;
    if (current.length === 0) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    // Mise à jour des champs standards
    await sql`
      UPDATE tickets
      SET
        statut      = COALESCE(${statut ?? null}, statut),
        priorite    = COALESCE(${priorite ?? null}, priorite),
        description = COALESCE(${description ?? null}, description),
        updated_at  = NOW()
      WHERE id = ${id}
    `;

    // Échéance (peut être null explicitement)
    if (echeanceInBody) {
      await sql`UPDATE tickets SET echeance = ${echeance} WHERE id = ${id}`;
    }

    // Checklist
    if (checklistInBody) {
      await sql`UPDATE tickets SET checklist = ${JSON.stringify(checklist)} WHERE id = ${id}`;
    }

    const updated = await sql`SELECT * FROM tickets WHERE id = ${id}`;

    // Historique — changement statut
    if (statut && statut !== current[0].statut) {
      try {
        await sql`
          INSERT INTO ticket_historique (id, ticket_id, user_id, action, ancienne_valeur, nouvelle_valeur)
          VALUES (gen_random_uuid(), ${id}, ${userId}, 'changement_statut', ${current[0].statut as string}, ${statut})
        `;
      } catch (histErr) {
        console.error('[tickets/[id] PUT] historique statut échoué:', (histErr as PgError).message);
      }
    }

    // Historique — changement priorité
    if (priorite && priorite !== current[0].priorite) {
      try {
        await sql`
          INSERT INTO ticket_historique (id, ticket_id, user_id, action, ancienne_valeur, nouvelle_valeur)
          VALUES (gen_random_uuid(), ${id}, ${userId}, 'changement_priorite', ${current[0].priorite as string}, ${priorite})
        `;
      } catch (histErr) {
        console.error('[tickets/[id] PUT] historique priorité échoué:', (histErr as PgError).message);
      }
    }

    // Historique — changement échéance
    if (echeanceInBody) {
      const ancienne = current[0].echeance ? String(current[0].echeance) : null;
      const nouvelle = echeance;
      if (ancienne !== nouvelle) {
        try {
          await sql`
            INSERT INTO ticket_historique (id, ticket_id, user_id, action, ancienne_valeur, nouvelle_valeur)
            VALUES (gen_random_uuid(), ${id}, ${userId}, 'changement_echeance', ${ancienne}, ${nouvelle})
          `;
        } catch (histErr) {
          console.error('[tickets/[id] PUT] historique échéance échoué:', (histErr as PgError).message);
        }
      }
    }

    return NextResponse.json({ ticket: updated[0] });
  } catch (error) {
    const e = error as PgError;
    console.error('[tickets/[id] PUT] ERREUR:', { message: e.message, code: e.code, detail: e.detail });
    return NextResponse.json({ error: 'Erreur serveur', detail: e.message }, { status: 500 });
  }
}
