import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendEmailPriseEnCharge } from '@/lib/emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nom_transporteur, visa_transporteur } = body as {
      nom_transporteur: string; visa_transporteur: string;
    };
    if (!nom_transporteur || !visa_transporteur) {
      return NextResponse.json({ error: 'Nom et initiales requis' }, { status: 400 });
    }
    const result = await sql`
      UPDATE envois_transport
      SET statut = 'envoye', envoye_at = NOW(),
          nom_transporteur = ${nom_transporteur.trim()},
          visa_transporteur = ${visa_transporteur.trim().toUpperCase()}
      WHERE id = ${id} AND statut = 'valide'
      RETURNING *
    `;
    if (result.length === 0) return NextResponse.json({ error: 'Envoi introuvable ou statut incorrect' }, { status: 404 });

    const counts = await sql`
      SELECT temperature, COUNT(*) as nb FROM envoi_sachets WHERE envoi_id = ${id} GROUP BY temperature
    `;
    const nb = (t: string) => Number(counts.find((c) => c.temperature === t)?.nb ?? 0);

    try {
      await sendEmailPriseEnCharge({
        id,
        nom_transporteur: nom_transporteur.trim(),
        visa_transporteur: visa_transporteur.trim().toUpperCase(),
        envoye_at: result[0].envoye_at as string,
        nb_ambiant: nb('ambiant'),
        nb_plus4: nb('+4'),
        nb_congele: nb('congele'),
      });
    } catch (mailErr) {
      console.error('[envoyer] email error', mailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/transport/envois/[id]/envoyer]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
