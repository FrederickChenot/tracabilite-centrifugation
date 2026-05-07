import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  const body = await req.json();

  const current = await sql`SELECT * FROM users WHERE id = ${userId}`;
  if (!current[0]) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

  const nom      = body.nom      !== undefined ? body.nom      : current[0].nom;
  const prenom   = body.prenom   !== undefined ? body.prenom   : current[0].prenom;
  const email    = body.email    !== undefined ? body.email    : current[0].email;
  const site_id  = body.site_id  !== undefined ? body.site_id  : current[0].site_id;
  const role     = body.role     !== undefined ? body.role     : current[0].role;
  const actif    = body.actif    !== undefined ? body.actif    : current[0].actif;

  const rows = await sql`
    UPDATE users
    SET nom = ${nom}, prenom = ${prenom}, email = ${email},
        site_id = ${site_id}, role = ${role}, actif = ${actif}
    WHERE id = ${userId}
    RETURNING id, email, nom, prenom, site_id, role, actif
  `;

  return NextResponse.json({ user: rows[0] });
}
