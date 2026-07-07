import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[cron/rappels] RESEND_API_KEY absente — rappels non envoyés');
    return NextResponse.json({ sent: 0, total: 0 });
  }
  const resend = new Resend(apiKey);
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://biolabtrack.fr';

  try {
    const rows = await sql`
      SELECT t.id, t.titre, t.numero_ticket, t.echeance, u.email, u.prenom
      FROM tickets t
      JOIN ticket_assignations ta ON ta.ticket_id = t.id
      JOIN users u ON u.id = ta.user_id
      WHERE t.statut NOT IN ('termine', 'annule')
        AND u.actif = true
        AND (
          t.echeance::date = CURRENT_DATE
          OR t.echeance::date = CURRENT_DATE + 2
        )
    `;

    let sent = 0;
    for (const row of rows) {
      const greeting = row.prenom ? `Bonjour ${row.prenom},` : 'Bonjour,';
      const dateStr = new Date(row.echeance as string).toLocaleDateString('fr-FR');
      const numero = row.numero_ticket as string | null;

      try {
        await resend.emails.send({
          from: 'BioLabTrack <noreply@biolabtrack.fr>',
          to: [row.email as string],
          subject: `⏰ Ticket ${row.titre as string} — échéance ${dateStr}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#0F6E56;color:white;padding:20px;border-radius:8px 8px 0 0">
                <h2 style="margin:0;font-size:18px">GCS Bio Med — BioLabTrack</h2>
                <p style="margin:6px 0 0;font-size:14px;opacity:0.85">Rappel d'échéance ticket</p>
              </div>
              <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;background:#fff">
                <p style="margin:0 0 16px;color:#374151">${greeting}</p>
                <p style="margin:0 0 20px;color:#374151">
                  Le ticket <strong>${row.titre as string}</strong>${numero ? ` (${numero})` : ''} a une échéance le <strong>${dateStr}</strong>.
                </p>
                <a href="${appUrl}/tickets/${row.id as string}"
                   style="display:inline-block;background:#0F6E56;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
                  Voir le ticket
                </a>
              </div>
            </div>
          `,
        });
        sent++;
      } catch (sendErr) {
        console.error('[cron/rappels] envoi échoué pour', row.email, sendErr);
      }
    }

    return NextResponse.json({ sent, total: rows.length });
  } catch (err) {
    console.error('[cron/rappels] erreur', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
