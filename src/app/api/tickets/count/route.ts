import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const userRow = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (!userRow.length) {
      return NextResponse.json({ count: 0 });
    }

    const rows = await sql`
      SELECT COUNT(DISTINCT t.id)::int AS count
      FROM tickets t
      JOIN ticket_assignations ta ON ta.ticket_id = t.id
      WHERE ta.user_id = ${userRow[0].id as number}
        AND t.statut IN ('a_faire', 'en_cours')
    `;

    return NextResponse.json({ count: rows[0]?.count ?? 0 });
  } catch (err) {
    console.error('[GET /api/tickets/count]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
