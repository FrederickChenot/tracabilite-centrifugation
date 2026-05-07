import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const { id } = await params;
    const result = await sql`DELETE FROM envoi_sachets WHERE id = ${id} RETURNING id`;
    if (result.length === 0) return NextResponse.json({ error: 'Sachet introuvable' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/transport/sachets/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
