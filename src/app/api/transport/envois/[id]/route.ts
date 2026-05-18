import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await sql`
      SELECT
        e.*,
        s.nom AS site_nom,
        d.nom AS dest_nom,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sa.id,
              'temperature', sa.temperature,
              'code_barre', sa.code_barre,
              'ordre', sa.ordre,
              'created_at', sa.created_at
            ) ORDER BY sa.ordre
          ) FILTER (WHERE sa.id IS NOT NULL),
          '[]'
        ) AS sachets
      FROM envois_transport e
      JOIN sites s ON e.site_id = s.id
      JOIN laboratoires_dest d ON e.dest_id = d.id
      LEFT JOIN envoi_sachets sa ON sa.envoi_id = e.id
      WHERE e.id = ${id}
      GROUP BY e.id, s.nom, d.nom
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Envoi non trouvé' }, { status: 404 })
    }
    return NextResponse.json({ envoi: result[0] })
  } catch (error) {
    console.error('[envois GET id]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
