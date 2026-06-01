import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { Resend } from 'resend';

type SessionUser = {
  id?: string;
  nom?: string | null;
  prenom?: string | null;
  role?: string;
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
  if (!session || (session.user as SessionUser).role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { motif } = body as { motif?: string };

    if (!motif || !motif.trim()) {
      return NextResponse.json({ error: 'Le motif d\'annulation est obligatoire' }, { status: 400 });
    }

    const ticketResult = await sql`
      SELECT id, titre, statut FROM tickets WHERE id = ${id}
    `;
    if (ticketResult.length === 0) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const ticket = ticketResult[0];
    if (ticket.statut === 'annule') {
      return NextResponse.json({ error: 'Ce ticket est déjà annulé' }, { status: 400 });
    }

    const user = session.user as SessionUser;
    const user_id = Number(user.id);
    const ancienStatut = ticket.statut as string;

    const updated = await sql`
      UPDATE tickets
      SET
        statut            = 'annule',
        motif_annulation  = ${motif.trim()},
        updated_at        = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    await sql`
      INSERT INTO ticket_historique (id, ticket_id, user_id, action, ancienne_valeur, nouvelle_valeur, commentaire)
      VALUES (
        gen_random_uuid(),
        ${id},
        ${user_id},
        'annulation',
        ${ancienStatut},
        'annule',
        ${motif.trim()}
      )
    `;

    // Notifier les assignés par email
    const assignes = await sql`
      SELECT u.email, u.nom, u.prenom
      FROM ticket_assignations ta
      JOIN users u ON u.id = ta.user_id
      WHERE ta.ticket_id = ${id}
    `;

    if (assignes.length > 0) {
      const resend = getResend();
      const appUrl = process.env.NEXTAUTH_URL ?? 'https://biolabtrack.fr';

      if (resend) {
        for (const u of assignes) {
          resend.emails
            .send({
              from: FROM,
              to: [u.email as string],
              subject: `BioLabTrack — Ticket annulé : ${ticket.titre as string}`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                  <div style="background:#b91c1c;color:white;padding:20px;border-radius:8px 8px 0 0">
                    <h2 style="margin:0;font-size:18px">GCS Bio Med — BioLabTrack</h2>
                    <p style="margin:6px 0 0;font-size:14px;opacity:0.85">Ticket annulé</p>
                  </div>
                  <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;background:#fff">
                    <p style="margin:0 0 12px;color:#374151">
                      Bonjour ${(u.prenom as string | null) ?? ''} ${(u.nom as string | null) ?? ''},
                    </p>
                    <p style="margin:0 0 12px;color:#374151">
                      Le ticket <strong>${ticket.titre as string}</strong> auquel vous étiez assigné a été annulé.
                    </p>
                    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px;width:40%">Motif</td>
                        <td style="padding:8px 0;font-weight:600;color:#111827">${motif.trim()}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#666;font-size:13px">Annulé par</td>
                        <td style="padding:8px 0;font-weight:600;color:#111827">
                          ${`${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || (session.user?.email ?? 'Administrateur')}
                        </td>
                      </tr>
                    </table>
                    <a href="${appUrl}/tickets/${id}"
                       style="display:inline-block;background:#6b7280;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
                      Voir le ticket
                    </a>
                  </div>
                  <div style="padding:12px 20px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb">
                    BioLabTrack — biolabtrack.fr
                  </div>
                </div>
              `,
            })
            .catch((err) => console.error('[tickets/annuler] email error:', err));
        }
      }
    }

    return NextResponse.json({ ticket: updated[0] });
  } catch (error) {
    console.error('[tickets/[id]/annuler POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
