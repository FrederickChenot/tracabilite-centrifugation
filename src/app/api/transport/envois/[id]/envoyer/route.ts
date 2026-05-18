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
    const { nom_transporteur, visa_transporteur } = body

    if (!nom_transporteur || !visa_transporteur) {
      return NextResponse.json(
        { error: 'nom_transporteur et visa_transporteur requis' },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE envois_transport
      SET
        statut = 'envoye',
        envoye_at = NOW(),
        nom_transporteur = ${nom_transporteur},
        visa_transporteur = ${visa_transporteur}
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
      const { sendEmailPriseEnCharge } = await import('@/lib/emails')
      await sendEmailPriseEnCharge({
        id: String(e.id),
        dest_nom: ed.dest_nom != null ? String(ed.dest_nom) : undefined,
        nom_transporteur: String(e.nom_transporteur),
        visa_transporteur: String(e.visa_transporteur),
        envoye_at: String(e.envoye_at),
        nb_ambiant: Number(ed.nb_ambiant ?? 0),
        nb_plus4: Number(ed.nb_plus4 ?? 0),
        nb_congele: Number(ed.nb_congele ?? 0),
      })
    } catch (emailError) {
      console.error('[envoyer] email error:', emailError)
    }

    return NextResponse.json({ success: true, envoi: result[0] })
  } catch (error) {
    console.error('[envoyer POST]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}