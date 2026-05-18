import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const { id } = await params
    await sql`DELETE FROM envoi_sachets WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[sachets DELETE]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
