import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const { id } = await params
    const result = await sql`
      UPDATE envois_transport
      SET statut = 'en_preparation', valide_at = NULL
      WHERE id = ${id} AND statut = 'valide'
      RETURNING *
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Transition invalide' }, { status: 409 })
    }
    const envoi = result[0]
    await logAudit(
      session.user?.email ?? null,
      'REOPEN_ENVOI',
      'envoi',
      String(id),
      envoi.site_id as number | undefined
    )
    return NextResponse.json({ success: true, envoi })
  } catch (error) {
    console.error('[rouvrir PATCH]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
