import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import sql from '@/lib/db';
import { hash } from 'bcryptjs';
import { sendEmailTempPassword } from '@/lib/emails';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

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
    SELECT id, email, nom, prenom FROM users WHERE id = ${userId} LIMIT 1
  `;
  if (!rows[0]) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

  const user = rows[0];
  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 10);

  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}, must_change_password = true
    WHERE id = ${userId}
  `;

  sendEmailTempPassword({
    email: user.email as string,
    prenom: user.prenom as string | undefined,
    tempPassword,
  }).catch((err) => console.error('[reset-password] email error:', err));

  await logAudit(
    session.user?.email ?? null,
    'RESET_PASSWORD',
    'user',
    String(userId)
  );

  return NextResponse.json({ success: true });
}
