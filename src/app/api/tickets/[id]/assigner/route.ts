import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { Resend } from 'resend';

type PgError = {
  message?: string;
  code?: string;
  detail?: string;
};

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM = 'BioLabTrack <onboarding@resend.dev>';

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
    const { user_ids } = body as { user_ids?: number[] };

    if (!Array.isArray(user_ids)) {
      return NextResponse.json(
        { error: "user_ids (tableau d'entiers) requis" },
        { status: 400 }
      );
    }

    const userRow = await sql`SELECT id, role FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (!userRow.length) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 });
    }
    const ROLES_ASSIGNATION = ['admin', 'biologiste', 'responsable_processus_info'];
    if (!ROLES_ASSIGNATION.includes(userRow[0].role as string)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    const assigne_par = userRow[0].id as number;

    const ticketResult = await sql`
      SELECT id, titre FROM tickets WHERE id = ${id}
    `;
    if (ticketResult.length === 0) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const ticket = ticketResult[0];

    const current = await sql`
      SELECT user_id FROM ticket_assignations WHERE ticket_id = ${id}
    `;
    const currentIds = current.map((r) => Number(r.user_id));

    const toAdd    = user_ids.filter((uid) => !currentIds.includes(uid));
    const toRemove = currentIds.filter((uid) => !user_ids.includes(uid));

    for (const uid of toRemove) {
      await sql`
        DELETE FROM ticket_assignations
        WHERE ticket_id = ${id} AND user_id = ${uid}
      `;
      try {
        await sql`
          INSERT INTO ticket_historique (id, ticket_id, user_id, action, ancienne_valeur)
          VALUES (gen_random_uuid(), ${id}, ${assigne_par}, 'desassignation', ${String(uid)})
        `;
      } catch (histErr) {
        console.error('[tickets/assigner] historique desassignation échoué:', (histErr as PgError).message);
      }
    }

    for (const uid of toAdd) {
      await sql`
        INSERT INTO ticket_assignations (ticket_id, user_id, assigne_par, assigne_le)
        VALUES (${id}, ${uid}, ${assigne_par}, NOW())
      `;
      try {
        await sql`
          INSERT INTO ticket_historique (id, ticket_id, user_id, action, nouvelle_valeur)
          VALUES (gen_random_uuid(), ${id}, ${assigne_par}, 'assignation', ${String(uid)})
        `;
      } catch (histErr) {
        console.error('[tickets/assigner] historique assignation échoué:', (histErr as PgError).message);
      }
    }

    if (toAdd.length > 0) {
      const newUsers = await sql`
        SELECT id, email, nom, prenom
        FROM users
        WHERE id::text = ANY(${toAdd.map(String)})
      `;
      const resend = getResend();
      const appUrl = process.env.NEXTAUTH_URL ?? 'https://biolabtrack.fr';

      if (resend) {
        for (const u of newUsers) {
          resend.emails
            .send({
              from: FROM,
              to: [u.email as string],
              subject: `BioLabTrack — Ticket assigné : ${ticket.titre as string}`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:#0F6E56;color:white;padding:20px;border-radius:8px 8px 0 0">
                    <h2 style="margin:0;font-size:18px">GCS Bio Med — BioLabTrack</h2>
                    <p style="margin:6px 0 0;font-size:14px;opacity:0.85">Nouveau ticket assigné</p>
                  </div>
                  <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;background:#fff">
                    <p style="margin:0 0 12px;color:#374151">
                      Bonjour ${(u.prenom as string | null) ?? ''} ${(u.nom as string | null) ?? ''},
                    </p>
                    <p style="margin:0 0 20px;color:#374151">
                      Le ticket <strong>${ticket.titre as string}</strong> vous a été assigné.
                    </p>
                    <a href="${appUrl}/tickets/${id}"
                       style="display:inline-block;background:#0F6E56;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
                      Voir le ticket
                    </a>
                  </div>
                  <div style="padding:12px 20px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb">
                    BioLabTrack — biolabtrack.fr
                  </div>
                </div>
              `,
            })
            .catch((err) => console.error('[tickets/assigner] email error:', err));
        }
      }
    }

    return NextResponse.json({ success: true, ajoutes: toAdd, retires: toRemove });
  } catch (error) {
    const e = error as PgError;
    console.error('[tickets/[id]/assigner POST] ERREUR:', { message: e.message, code: e.code, detail: e.detail });
    return NextResponse.json({ error: 'Erreur serveur', detail: e.message }, { status: 500 });
  }
}
