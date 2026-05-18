import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false })
  try {
    const rows = await sql`
      SELECT id FROM password_reset_tokens
      WHERE token = ${token} AND expires_at > NOW() AND used = false
      LIMIT 1
    `
    return NextResponse.json({ valid: rows.length > 0 })
  } catch {
    return NextResponse.json({ valid: false })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password || (password as string).length < 8) {
      return NextResponse.json({ error: 'Token et mot de passe (min 8 caractères) requis' }, { status: 400 })
    }

    const tokens = await sql`
      SELECT * FROM password_reset_tokens
      WHERE token = ${token as string} AND expires_at > NOW() AND used = false
      LIMIT 1
    `
    if (!tokens[0]) {
      return NextResponse.json({ error: 'Lien expiré ou invalide' }, { status: 400 })
    }

    const tokenRow = tokens[0]
    const passwordHash = await hash(password as string, 12)

    await sql`
      UPDATE users SET password_hash = ${passwordHash}, must_change_password = false
      WHERE id = ${tokenRow.user_id as number}
    `
    await sql`UPDATE password_reset_tokens SET used = true WHERE id = ${tokenRow.id as string}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[reset-password POST]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
