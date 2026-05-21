import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import sql from '@/lib/db'
import { sendEmailForgotPassword } from '@/lib/emails'

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://biolabtrack.fr'

export async function POST(req: NextRequest) {
  const always = NextResponse.json({ success: true })
  try {
    const { email } = await req.json()
    console.log('[forgot-password] email reçu:', email)

    if (!email) return always

    const users = await sql`
      SELECT id, nom, email FROM users
      WHERE email = ${email as string} AND actif = true
      LIMIT 1
    `
    console.log('[forgot-password] users trouvés:', users.length)

    if (!users[0]) {
      console.log('[forgot-password] aucun user trouvé pour:', email)
      return always
    }

    const user = users[0]
    const token = randomBytes(32).toString('hex')

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id as number}, ${token}, NOW() + INTERVAL '1 hour')
      ON CONFLICT (token) DO NOTHING
    `
    console.log('[forgot-password] token créé')

    const resetUrl = `${BASE_URL}/login/reset-password?token=${token}`
    console.log('[forgot-password] resetUrl:', resetUrl)

    const result = await sendEmailForgotPassword({
      email: process.env.EMAIL_EXPEDITEUR ?? user.email as string,
      nom: user.nom as string | undefined,
      resetUrl,
    })
    console.log('[forgot-password] email envoyé:', result)

  } catch (err) {
    console.error('[forgot-password] ERREUR:', err)
  }
  return always
}
