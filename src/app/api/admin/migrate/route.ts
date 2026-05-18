import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import sql from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(100) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false`
    return NextResponse.json({ success: true, message: 'Migrations appliquées' })
  } catch (error) {
    console.error('[migrate]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
