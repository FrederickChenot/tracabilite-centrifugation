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

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const site_id = searchParams.get('site_id');
  if (!site_id) return NextResponse.json({ error: 'site_id requis' }, { status: 400 });

  const rows = await sql`
    SELECT id, site_id, nom, modele, est_backup, actif
    FROM centrifugeuses
    WHERE site_id = ${Number(site_id)}
    ORDER BY est_backup ASC, nom ASC
  `;
  return NextResponse.json({ centrifugeuses: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const parsed = CreateCentriSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { site_id, nom, modele, est_backup } = parsed.data;
  const result = await sql`
    INSERT INTO centrifugeuses (site_id, nom, modele, est_backup)
    VALUES (${site_id}, ${nom}, ${modele}, ${est_backup})
    RETURNING id, site_id, nom, modele, est_backup, actif
  `;
  return NextResponse.json(result[0], { status: 201 });
}
