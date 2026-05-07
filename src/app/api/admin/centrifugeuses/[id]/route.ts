import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const PatchCentriSchema = z.object({
  nom: z.string().min(1).max(50).optional(),
  modele: z.string().min(1).max(50).optional(),
  est_backup: z.boolean().optional(),
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
    const parsed = PatchCentriSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { nom, modele, est_backup, actif } = parsed.data;
    const result = await sql`
      UPDATE centrifugeuses SET
        nom        = COALESCE(${nom ?? null}, nom),
        modele     = COALESCE(${modele ?? null}, modele),
        est_backup = COALESCE(${est_backup ?? null}, est_backup),
        actif      = COALESCE(${actif ?? null}, actif)
      WHERE id = ${Number(id)}
      RETURNING id, site_id, nom, modele, est_backup, actif
    `;

    if (result.length === 0) return NextResponse.json({ error: 'Centrifugeuse introuvable' }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('[PATCH /api/admin/centrifugeuses/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
