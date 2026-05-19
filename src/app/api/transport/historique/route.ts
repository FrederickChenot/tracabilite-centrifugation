import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const site_id = searchParams.get('site_id');
    const dest_id = searchParams.get('dest_id');
    const statut = searchParams.get('statut');
    const date_debut = searchParams.get('date_debut');
    const date_fin = searchParams.get('date_fin');
    const visa = searchParams.get('visa');

    const rows = await sql`
      SELECT
        e.id,
        e.created_at,
        e.site_id,
        e.statut,
        e.visa_expediteur,
        s.nom AS site_nom,
        d.nom AS dest_nom,
        COUNT(sa.id) FILTER (WHERE sa.temperature = 'ambiant') AS nb_ambiant,
        COUNT(sa.id) FILTER (WHERE sa.temperature = 'plus4')   AS nb_plus4,
        COUNT(sa.id) FILTER (WHERE sa.temperature = 'congele') AS nb_congele,
        COUNT(sa.id) AS nb_total
      FROM envois_transport e
      JOIN sites             s  ON s.id = e.site_id
      JOIN laboratoires_dest d  ON d.id = e.dest_id
      LEFT JOIN envoi_sachets sa ON sa.envoi_id = e.id
      WHERE ${site_id ? sql`e.site_id = ${Number(site_id)}` : sql`TRUE`}
        AND ${dest_id ? sql`e.dest_id = ${Number(dest_id)}` : sql`TRUE`}
        AND ${statut ? sql`e.statut = ${statut}` : sql`TRUE`}
        AND ${date_debut ? sql`e.created_at::date >= ${date_debut}::date` : sql`TRUE`}
        AND ${date_fin ? sql`e.created_at::date <= ${date_fin}::date` : sql`TRUE`}
        AND ${visa ? sql`e.visa_expediteur ILIKE ${'%' + visa + '%'}` : sql`TRUE`}
      GROUP BY e.id, s.nom, d.nom
      ORDER BY e.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ envois: rows });
  } catch (err) {
    console.error('[GET /api/transport/historique]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
