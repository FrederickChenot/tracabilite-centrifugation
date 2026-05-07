import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const CreateCentriSchema = z.object({
  site_id: z.number().int().positive(),
  nom: z.string().min(1).max(50),
  modele: z.string().min(1).max(50),
  est_backup: z.boolean().default(false),
});

async function ensureCentrifugeusesActif() {
  await sql`ALTER TABLE centrifugeuses ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const site_id = searchParams.get('site_id');
    if (!site_id) return NextResponse.json({ error: 'site_id requis' }, { status: 400 });

    await ensureCentrifugeusesActif();
    const rows = await sql`
      SELECT id, site_id, nom, modele, est_backup, actif
      FROM centrifugeuses
      WHERE site_id = ${Number(site_id)}
      ORDER BY est_backup ASC, nom ASC
    `;
    return NextResponse.json({ centrifugeuses: rows });
  } catch (err) {
    console.error('[GET /api/admin/centrifugeuses]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = CreateCentriSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { site_id, nom, modele, est_backup } = parsed.data;
    await ensureCentrifugeusesActif();
    const result = await sql`
      INSERT INTO centrifugeuses (site_id, nom, modele, est_backup, actif)
      VALUES (${site_id}, ${nom}, ${modele}, ${est_backup}, true)
      RETURNING *
    `;
    return NextResponse.json({ success: true, centrifugeuse: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/centrifugeuses]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
