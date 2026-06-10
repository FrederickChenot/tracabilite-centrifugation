import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  const hasLabo = request.cookies.get('labo_access')?.value === 'true';
  const session = await auth();
  if (!hasLabo && !session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const users = await sql`
      SELECT id, prenom, nom, matricule
      FROM users
      WHERE actif = true
      ORDER BY prenom ASC, nom ASC
    `;
    return NextResponse.json({ users });
  } catch (err) {
    console.error('[GET /api/centri/users]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
