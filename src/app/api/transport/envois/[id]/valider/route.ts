import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const { id } = await params;
    const result = await sql`
      UPDATE envois_transport
      SET statut = 'valide', valide_at = NOW()
      WHERE id = ${id} AND statut = 'en_preparation'
      RETURNING *
    `;
    if (result.length === 0) return NextResponse.json({ error: 'Envoi introuvable ou déjà validé' }, { status: 404 });
    return NextResponse.json({ success: true, envoi: result[0] });
  } catch (err) {
    console.error('[PATCH /api/transport/envois/[id]/valider]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
