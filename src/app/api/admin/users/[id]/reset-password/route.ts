import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { sendEmailForgotPassword } from '@/lib/emails';

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://biolabtrack.fr';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);

  const rows = await sql`
    SELECT id, email, nom FROM users WHERE id = ${userId} LIMIT 1
  `;
  if (!rows[0]) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

  const user = rows[0];
  const token = randomBytes(32).toString('hex');

  await sql`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (${user.id as number}, ${token}, NOW() + INTERVAL '1 hour')
    ON CONFLICT (token) DO NOTHING
  `;

  const resetUrl = `${BASE_URL}/login/reset-password?token=${token}`;
  await sendEmailForgotPassword({
    email: user.email as string,
    nom: user.nom as string | undefined,
    resetUrl,
  });

  return NextResponse.json({ success: true });
}
