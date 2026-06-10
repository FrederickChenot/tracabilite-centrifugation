import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const site_id    = searchParams.get('site_id')   ? Number(searchParams.get('site_id'))   : null;
  const centri_id  = searchParams.get('centri_id') ? Number(searchParams.get('centri_id')) : null;
  const date_debut = searchParams.get('date_debut') || null;
  const date_fin   = searchParams.get('date_fin')   || null;
  const visa       = searchParams.get('visa')?.trim() || null;
  const num_tube   = searchParams.get('num_tube')?.trim() || null;
  const page       = Math.max(0, Number(searchParams.get('page') ?? 0));

  const where = sql`
    ${site_id   ? sql`s.site_id   = ${site_id}`                        : sql`TRUE`}
    AND ${centri_id ? sql`s.centri_id = ${centri_id}`                  : sql`TRUE`}
    AND ${date_debut ? sql`s.opened_at::date >= ${date_debut}::date`   : sql`TRUE`}
    AND ${date_fin   ? sql`s.opened_at::date <= ${date_fin}::date`     : sql`TRUE`}
    AND ${visa       ? sql`s.visa ILIKE ${visa + '%'}`                  : sql`TRUE`}
    AND ${num_tube   ? sql`EXISTS (
      SELECT 1 FROM tubes_centri tc
      WHERE tc.session_id = s.id
        AND tc.num_echant ILIKE ${'%' + num_tube + '%'}
    )`                                                                  : sql`TRUE`}
  `;

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT
        s.id, s.site_id, s.centri_id, s.prog_id, s.stockage, s.visa,
        s.opened_at, s.closed_at, s.statut,
        c.nom    AS centri_nom,
        p.libelle AS prog_libelle,
        p.numero  AS prog_numero,
        si.nom   AS site_nom,
        COUNT(t.id)::int AS nb_tubes,
        COALESCE(
          array_agg(t.num_echant ORDER BY t.scanned_at) FILTER (WHERE t.id IS NOT NULL),
          ARRAY[]::text[]
        ) AS echantillons,
        COALESCE(
          array_agg(DISTINCT t.stockage) FILTER (WHERE t.stockage IS NOT NULL),
          ARRAY[]::text[]
        ) AS stockages_tubes,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'num_echant', t.num_echant, 'scanned_at', t.scanned_at, 'stockage', t.stockage)
            ORDER BY t.scanned_at
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS tubes
      FROM sessions_centri s
      JOIN centrifugeuses c  ON s.centri_id = c.id
      JOIN programmes     p  ON s.prog_id   = p.id
      JOIN sites          si ON s.site_id   = si.id
      LEFT JOIN tubes_centri t ON t.session_id = s.id
      WHERE ${where}
      GROUP BY s.id, c.nom, p.libelle, p.numero, si.nom
      ORDER BY s.opened_at DESC
      LIMIT 50 OFFSET ${page * 50}
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM sessions_centri s
      WHERE ${where}
    `,
  ]);

  const total = countRows[0]?.total ?? 0;
  return NextResponse.json({ sessions: rows, total, page, pages: Math.ceil(total / 50) });
}
