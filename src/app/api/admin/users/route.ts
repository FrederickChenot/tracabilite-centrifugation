import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import sql from '@/lib/db';
import { hash } from 'bcryptjs';
import { sendEmailBienvenue } from '@/lib/emails';

const ROLES_LECTURE = ['admin', 'biologiste', 'responsable_processus_info'];

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !ROLES_LECTURE.includes(role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rows = await sql`
      SELECT u.id, u.email, u.matricule, u.nom, u.prenom, u.role, u.actif, u.created_at,
             s.nom AS site_nom, u.site_id
      FROM users u
      LEFT JOIN sites s ON s.id = u.site_id
      ORDER BY u.nom, u.prenom
    `;
    return NextResponse.json({ users: rows });
  } catch (err) {
    console.error('[GET /api/admin/users]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, nom, prenom, site_id, role, matricule } = body as {
    email?: string;
    password?: string;
    nom?: string | null;
    prenom?: string | null;
    site_id?: string | null;
    role?: string;
    matricule?: string | null;
  };

  if (!email || !password || !nom || !prenom) {
    return NextResponse.json({ error: 'email, password, nom et prenom sont requis' }, { status: 400 });
  }
  if (!matricule) {
    return NextResponse.json({ error: 'Le matricule est obligatoire' }, { status: 400 });
  }
  const PWD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!PWD_REGEX.test(password as string)) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères, 1 majuscule et 1 chiffre' }, { status: 400 });
  }

  const VALID_ROLES = ['technicien', 'biologiste', 'secretaire', 'cadre', 'assistante_qualite', 'agent_transverse', 'responsable_processus_info', 'admin'];
  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
  }

  const passwordHash = await hash(password, 10);

  try {
    const rows = await sql`
      INSERT INTO users (email, password_hash, nom, prenom, site_id, role, matricule, must_change_password)
      VALUES (
        ${email},
        ${passwordHash},
        ${nom},
        ${prenom},
        ${site_id ?? null},
        ${role ?? 'technicien'},
        ${matricule},
        true
      )
      RETURNING id, email, matricule, nom, prenom, site_id, role, actif, created_at
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
      if (err.message?.includes('matricule')) {
        return NextResponse.json({ error: 'Ce matricule est déjà utilisé' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }
    console.error('[users POST] ERREUR:', err.message);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}
