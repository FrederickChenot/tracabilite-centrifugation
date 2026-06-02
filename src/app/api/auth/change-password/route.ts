import { NextRequest, NextResponse } from 'next/server'
import { hash, compare } from 'bcryptjs'
import { auth } from '@/lib/auth'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const userId = session.user.id
  if (!userId || userId === 0) {
    return NextResponse.json(
      { error: 'Non disponible pour le compte administrateur système' },
      { status: 400 }
    )
  }

  const { ancien_password, nouveau_password } = await req.json()

  if (!ancien_password || !nouveau_password) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }
  const PWD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!PWD_REGEX.test(nouveau_password as string)) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 8 caractères, 1 majuscule et 1 chiffre' },
      { status: 400 }
    )
  }

  const rows = await sql`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1`
  if (!rows[0]) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

  const valid = await compare(ancien_password as string, rows[0].password_hash as string)
  if (!valid) return NextResponse.json({ error: 'Ancien mot de passe incorrect' }, { status: 400 })

  const newHash = await hash(nouveau_password as string, 12)
  await sql`
    UPDATE users SET password_hash = ${newHash}, must_change_password = false
    WHERE id = ${userId}
  `

  return NextResponse.json({ success: true })
}
