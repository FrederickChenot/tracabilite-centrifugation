import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
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
      WHERE id = ${id} AND statut = 'valide'
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Bon déjà pris en charge ou invalide' }, { status: 409 })
    }

    const envoi = result[0]

    await logAudit(
      null,
      'PICKUP_ENVOI',
      'envoi',
      String(id),
      envoi.site_id as number | undefined,
      { transporteur: nom_transporteur as string, visa: visa_transporteur as string }
    )

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
      const ed = emailData[0] ?? {}
      const { sendEmailPriseEnCharge } = await import('@/lib/emails')
      await sendEmailPriseEnCharge({
        id: String(envoi.id),
        numero_bordereau: envoi.numero_bordereau != null ? String(envoi.numero_bordereau) : null,
        dest_nom: ed.dest_nom != null ? String(ed.dest_nom) : undefined,
        nom_transporteur: String(envoi.nom_transporteur),
        visa_transporteur: String(envoi.visa_transporteur),
        envoye_at: String(envoi.envoye_at),
        nb_ambiant: Number(ed.nb_ambiant ?? 0),
        nb_plus4: Number(ed.nb_plus4 ?? 0),
        nb_congele: Number(ed.nb_congele ?? 0),
      })
    } catch (emailError) {
      console.error('[envoyer] email error:', emailError)
    }

    return NextResponse.json({ success: true, envoi })
  } catch (error) {
    console.error('[envoyer POST]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
