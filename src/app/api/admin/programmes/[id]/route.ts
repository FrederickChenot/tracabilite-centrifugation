import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const PatchProgSchema = z.object({
  numero: z.number().int().min(1).optional(),
  libelle: z.string().min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = PatchProgSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { numero, libelle } = parsed.data;
    const result = await sql`
      UPDATE programmes SET
        numero  = COALESCE(${numero ?? null}, numero),
        libelle = COALESCE(${libelle ?? null}, libelle)
      WHERE id = ${Number(id)}
      RETURNING id, centrifugeuse_id, numero, libelle
    `;

    if (result.length === 0) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('[PATCH /api/admin/programmes/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id } = await params;

    const used = await sql`
      SELECT COUNT(*) as nb FROM sessions_centri WHERE prog_id = ${Number(id)}
    `;
    if (Number(used[0].nb) > 0) {
      return NextResponse.json(
        { error: `Ce programme est utilisé dans ${used[0].nb} session(s) — suppression impossible.` },
        { status: 409 }
      );
    }

    const result = await sql`DELETE FROM programmes WHERE id = ${Number(id)} RETURNING id`;
    if (result.length === 0) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/admin/programmes/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
