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
      const { sendEmailReception } = await import('@/lib/emails')
      await sendEmailReception(result[0])
    } catch (emailError) {
      console.error('[receptionner] email error:', emailError)
    }

    return NextResponse.json({ success: true, envoi: result[0] })
  } catch (error) {
    console.error('[receptionner POST]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}