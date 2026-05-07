import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const { nom, email_reception, actif } = body as { nom?: string; email_reception?: string; actif?: boolean };
    const result = await sql`
      UPDATE laboratoires_dest SET
        nom             = COALESCE(${nom?.trim() ?? null}, nom),
        email_reception = COALESCE(${email_reception?.trim() ?? null}, email_reception),
        actif           = COALESCE(${actif ?? null}, actif)
      WHERE id = ${Number(id)}
      RETURNING *
    `;
    if (result.length === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('[PATCH /api/admin/laboratoires/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
