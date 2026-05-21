import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import sql from '@/lib/db'
import { sendEmailForgotPassword } from '@/lib/emails'

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://biolabtrack.fr'

export async function POST(req: NextRequest) {
  const always = NextResponse.json({ success: true })
  try {
    const { email } = await req.json()
    if (!email) return always

    const users = await sql`
      SELECT id, nom, email FROM users
      WHERE email = ${email as string} AND actif = true
      LIMIT 1
    `
    if (!users[0]) return always

    const user = users[0]
    const token = randomBytes(32).toString('hex')

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id as number}, ${token}, NOW() + INTERVAL '1 hour')
      ON CONFLICT (token) DO NOTHING
    `

    const resetUrl = `${BASE_URL}/login/reset-password?token=${token}`
    await sendEmailForgotPassword({
      email: process.env.EMAIL_EXPEDITEUR ?? user.email as string,
      nom: user.nom as string | undefined,
      resetUrl,
    })
  } catch (err) {
    console.error('[forgot-password]', err)
  }
  return always
}
