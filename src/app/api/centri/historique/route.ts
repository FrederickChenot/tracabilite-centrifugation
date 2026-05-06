import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { HistoriqueSession } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const site_id = searchParams.get('site_id');
  const date = searchParams.get('date');

  if (!site_id || !date) {
    return NextResponse.json({ error: 'site_id et date requis' }, { status: 400 });
  }

  const sessions = await sql`
    SELECT
      s.id, s.site_id, s.centri_id, s.prog_id, s.stockage, s.visa,
      s.opened_at, s.closed_at, s.statut,
      c.nom as centri_nom,
      p.libelle as prog_libelle,
      p.numero as prog_numero
    FROM sessions_centri s
    LEFT JOIN centrifugeuses c ON c.id = s.centri_id
    LEFT JOIN programmes p ON p.id = s.prog_id
    WHERE s.site_id = ${Number(site_id)}
      AND DATE(s.opened_at AT TIME ZONE 'Europe/Paris') = ${date}::date
    ORDER BY s.opened_at DESC
  `;

  const tubes = await sql`
    SELECT t.id, t.session_id, t.num_echant, t.scanned_at
    FROM tubes_centri t
    INNER JOIN sessions_centri s ON s.id = t.session_id
    WHERE s.site_id = ${Number(site_id)}
      AND DATE(s.opened_at AT TIME ZONE 'Europe/Paris') = ${date}::date
    ORDER BY t.scanned_at ASC
  `;

  const tubesBySession = new Map<string, typeof tubes>();
  for (const tube of tubes) {
    if (!tubesBySession.has(tube.session_id)) {
      tubesBySession.set(tube.session_id, []);
    }
    tubesBySession.get(tube.session_id)!.push(tube);
  }

  const result: HistoriqueSession[] = sessions.map((s) => ({
    id: s.id,
    site_id: s.site_id,
    centri_id: s.centri_id,
    prog_id: s.prog_id,
    stockage: s.stockage,
    visa: s.visa,
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    statut: s.statut,
    centri_nom: s.centri_nom,
    prog_libelle: s.prog_libelle,
    prog_numero: s.prog_numero,
    tubes: (tubesBySession.get(s.id) ?? []).map((t) => ({
      id: t.id,
      session_id: t.session_id,
      num_echant: t.num_echant,
      scanned_at: t.scanned_at,
    })),
  }));

  return NextResponse.json({ sessions: result });
}
