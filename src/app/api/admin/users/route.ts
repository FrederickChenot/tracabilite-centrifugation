import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { hash } from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await sql`
    SELECT u.id, u.email, u.nom, u.prenom, u.role, u.actif, u.created_at,
           s.nom AS site_nom, u.site_id
    FROM users u
    LEFT JOIN sites s ON s.id = u.site_id
    ORDER BY u.created_at DESC
  `;
  return NextResponse.json({ users: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, nom, prenom, site_id, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: 'email et password requis' }, { status: 400 });
  }

  const passwordHash = await hash(password as string, 12);

  try {
    const rows = await sql`
      INSERT INTO users (email, password_hash, nom, prenom, site_id, role)
      VALUES (
        ${email as string},
        ${passwordHash},
        ${(nom as string | null) ?? null},
        ${(prenom as string | null) ?? null},
        ${(site_id as number | null) ?? null},
        ${(role as string) ?? 'technicien'}
      )
      RETURNING id, email, nom, prenom, site_id, role, actif, created_at
    `;
    return NextResponse.json({ user: rows[0] }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}
