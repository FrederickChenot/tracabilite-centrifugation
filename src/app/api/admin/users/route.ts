import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import sql from '@/lib/db';
import { hash } from 'bcryptjs';
import { sendEmailBienvenue } from '@/lib/emails';

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
  const { email, password, nom, prenom, site_id, role } = body as {
    email?: string;
    password?: string;
    nom?: string | null;
    prenom?: string | null;
    site_id?: string | null;
    role?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'email et password requis' }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);

  try {
    const rows = await sql`
      INSERT INTO users (email, password_hash, nom, prenom, site_id, role)
      VALUES (
        ${email},
        ${passwordHash},
        ${nom ?? null},
        ${prenom ?? null},
        ${site_id ?? null},
        ${role ?? 'technicien'}
      )
      RETURNING id, email, nom, prenom, site_id, role, actif, created_at
    `;

    sendEmailBienvenue({
      email,
      prenom: prenom ?? undefined,
      nom: nom ?? undefined,
      tempPassword: password,
    }).catch((err) => console.error('[users] welcome email error:', err));

    await logAudit(
      session.user?.email ?? null,
      'CREATE_USER',
      'user',
      String(rows[0].id)
    );

    return NextResponse.json({ user: rows[0] }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }
    console.error('[users POST] ERREUR:', err.message);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}
