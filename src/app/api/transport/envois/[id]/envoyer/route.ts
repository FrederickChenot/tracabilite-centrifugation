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
      const { sendEmailPriseEnCharge } = await import('@/lib/emails')
      await sendEmailPriseEnCharge(result[0])
    } catch (emailError) {
      console.error('[envoyer] email error:', emailError)
    }

    return NextResponse.json({ success: true, envoi: result[0] })
  } catch (error) {
    console.error('[envoyer POST]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}