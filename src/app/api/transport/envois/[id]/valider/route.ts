import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await sql`
      UPDATE envois_transport
      SET statut = 'valide', valide_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Envoi non trouvé' }, { status: 404 })
    }
    return NextResponse.json({ success: true, envoi: result[0] })
  } catch (error) {
    console.error('[valider PATCH]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}