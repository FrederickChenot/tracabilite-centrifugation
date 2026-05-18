import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nom_receptionnaire, visa_receptionnaire } = body

    if (!nom_receptionnaire || !visa_receptionnaire) {
      return NextResponse.json(
        { error: 'nom_receptionnaire et visa_receptionnaire requis' },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE envois_transport
      SET
        statut = 'receptionne',
        receptionne_at = NOW(),
        nom_receptionnaire = ${nom_receptionnaire},
        visa_receptionnaire = ${visa_receptionnaire}
      WHERE id = ${id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Envoi non trouvé' }, { status: 404 })
    }

    try {
      const emailData = await sql`
        SELECT
          d.nom AS dest_nom,
          COUNT(sa.id) FILTER (WHERE sa.temperature = 'ambiant')::int AS nb_ambiant,
          COUNT(sa.id) FILTER (WHERE sa.temperature = 'plus4')::int AS nb_plus4,
          COUNT(sa.id) FILTER (WHERE sa.temperature = 'congele')::int AS nb_congele
        FROM envois_transport e
        JOIN laboratoires_dest d ON d.id = e.dest_id
        LEFT JOIN envoi_sachets sa ON sa.envoi_id = e.id
        WHERE e.id = ${id}
        GROUP BY d.nom
      `
      const e = result[0]
      const ed = emailData[0] ?? {}
      const { sendEmailReception } = await import('@/lib/emails')
      await sendEmailReception({
        id: String(e.id),
        dest_nom: String(ed.dest_nom ?? ''),
        nom_receptionnaire: String(e.nom_receptionnaire),
        visa_receptionnaire: String(e.visa_receptionnaire),
        receptionne_at: String(e.receptionne_at),
        nb_ambiant: Number(ed.nb_ambiant ?? 0),
        nb_plus4: Number(ed.nb_plus4 ?? 0),
        nb_congele: Number(ed.nb_congele ?? 0),
      })
    } catch (emailError) {
      console.error('[receptionner] email error:', emailError)
    }

    return NextResponse.json({ success: true, envoi: result[0] })
  } catch (error) {
    console.error('[receptionner POST]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}