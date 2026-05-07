import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const PatchSiteSchema = z.object({
  nom: z.string().min(1).max(50).optional(),
  actif: z.boolean().optional(),
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
    const parsed = PatchSiteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { nom, actif } = parsed.data;
    const result = await sql`
      UPDATE sites SET
        nom   = COALESCE(${nom ?? null}, nom),
        actif = COALESCE(${actif ?? null}, actif)
      WHERE id = ${Number(id)}
      RETURNING id, nom, actif
    `;

    if (result.length === 0) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('[PATCH /api/admin/sites/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
