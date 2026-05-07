import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmailReception } from '@/lib/emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nom_receptionnaire, visa_receptionnaire } = body as {
      nom_receptionnaire: string; visa_receptionnaire: string;
    };
    if (!nom_receptionnaire || !visa_receptionnaire) {
      return NextResponse.json({ error: 'Nom et initiales requis' }, { status: 400 });
    }
    const envois = await sql`
      SELECT e.*, l.nom AS dest_nom FROM envois_transport e
      JOIN laboratoires_dest l ON l.id = e.dest_id
      WHERE e.id = ${id} AND e.statut = 'envoye'
    `;
    if (envois.length === 0) return NextResponse.json({ error: 'Envoi introuvable ou statut incorrect' }, { status: 404 });

    await sql`
      UPDATE envois_transport
      SET statut = 'receptionne', receptionne_at = NOW(),
          nom_receptionnaire = ${nom_receptionnaire.trim()},
          visa_receptionnaire = ${visa_receptionnaire.trim().toUpperCase()}
      WHERE id = ${id}
    `;

    const counts = await sql`
      SELECT temperature, COUNT(*) as nb FROM envoi_sachets WHERE envoi_id = ${id} GROUP BY temperature
    `;
    const nb = (t: string) => Number(counts.find((c) => c.temperature === t)?.nb ?? 0);

    try {
      await sendEmailReception({
        id,
        dest_nom: envois[0].dest_nom as string,
        nom_receptionnaire: nom_receptionnaire.trim(),
        visa_receptionnaire: visa_receptionnaire.trim().toUpperCase(),
        receptionne_at: new Date().toISOString(),
        nb_ambiant: nb('ambiant'),
        nb_plus4: nb('+4'),
        nb_congele: nb('congele'),
      });
    } catch (mailErr) {
      console.error('[receptionner] email error', mailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/transport/envois/[id]/receptionner]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
