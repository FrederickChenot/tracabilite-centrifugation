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
    await sql`ALTER TABLE sites ADD COLUMN IF NOT EXISTS email_notifications VARCHAR(100)`
    await sql`UPDATE sites SET email_notifications = '' WHERE email_notifications IS NULL`
    await sql`ALTER TABLE envoi_sachets DROP CONSTRAINT IF EXISTS envoi_sachets_temperature_check`
    await sql`ALTER TABLE envoi_sachets ADD CONSTRAINT envoi_sachets_temperature_check CHECK (temperature IN ('ambiant','plus4','congele'))`
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email VARCHAR(100),
        action VARCHAR(50) NOT NULL,
        entity VARCHAR(50),
        entity_id VARCHAR(100),
        site_id INT,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)
    `
    return NextResponse.json({ success: true, message: 'Migrations appliquées' })
  } catch (error) {
    console.error('[migrate]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
