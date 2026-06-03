import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const hasLabo = request.cookies.get('labo_access')?.value === 'true';
  if (!session && !hasLabo) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const result = await sql`
    SELECT
      s.*,
      c.nom      AS centri_nom,
      p.libelle  AS prog_libelle,
      p.numero   AS prog_numero,
      COALESCE(
        json_agg(
          json_build_object(
            'id',         t.id,
            'session_id', t.session_id,
            'num_echant', t.num_echant,
            'scanned_at', t.scanned_at,
            'stockage',   t.stockage
          ) ORDER BY t.scanned_at
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) AS tubes
    FROM sessions_centri s
    LEFT JOIN centrifugeuses c ON c.id = s.centri_id
    LEFT JOIN programmes      p ON p.id = s.prog_id
    LEFT JOIN tubes_centri    t ON t.session_id = s.id
    WHERE s.id = ${id}
    GROUP BY s.id, c.nom, p.libelle, p.numero
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }

  return NextResponse.json({ session: result[0] });
}
