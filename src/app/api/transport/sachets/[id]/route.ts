import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await sql`DELETE FROM envoi_sachets WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[sachets DELETE]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}