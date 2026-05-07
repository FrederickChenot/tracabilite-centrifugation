import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { hash } from 'bcryptjs';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
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

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 12);

  const rows = await sql`
    UPDATE users SET password_hash = ${passwordHash}
    WHERE id = ${userId}
    RETURNING id, email
  `;

  if (!rows[0]) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

  return NextResponse.json({ tempPassword });
}
