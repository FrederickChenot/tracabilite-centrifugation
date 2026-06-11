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
      WHERE id = ${id} AND statut = 'envoye'
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Bon déjà réceptionné ou invalide' }, { status: 409 })
    }

    const envoi = result[0]

    await logAudit(
      null,
      'RECEIVE_ENVOI',
      'envoi',
      String(id),
      envoi.site_id as number | undefined,
      { receptionnaire: nom_receptionnaire as string, visa: visa_receptionnaire as string }
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
      const { sendEmailReception } = await import('@/lib/emails')
      await sendEmailReception({
        id: String(envoi.id),
        numero_bordereau: envoi.numero_bordereau != null ? String(envoi.numero_bordereau) : null,
        dest_nom: String(ed.dest_nom ?? ''),
        nom_receptionnaire: String(envoi.nom_receptionnaire),
        visa_receptionnaire: String(envoi.visa_receptionnaire),
        receptionne_at: String(envoi.receptionne_at),
        nb_ambiant: Number(ed.nb_ambiant ?? 0),
        nb_plus4: Number(ed.nb_plus4 ?? 0),
        nb_congele: Number(ed.nb_congele ?? 0),
      })
    } catch (emailError) {
      console.error('[receptionner] email error:', emailError)
    }

    return NextResponse.json({ success: true, envoi })
  } catch (error) {
    console.error('[receptionner POST]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
