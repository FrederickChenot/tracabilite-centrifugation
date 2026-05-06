import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const CreateProgSchema = z.object({
  centrifugeuse_id: z.number().int().positive(),
  numero: z.number().int().min(1),
  libelle: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const centri_id = searchParams.get('centri_id');
  if (!centri_id) return NextResponse.json({ error: 'centri_id requis' }, { status: 400 });

  const rows = await sql`
    SELECT id, centrifugeuse_id, numero, libelle
    FROM programmes
    WHERE centrifugeuse_id = ${Number(centri_id)}
    ORDER BY numero ASC
  `;
  return NextResponse.json({ programmes: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const parsed = CreateProgSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { centrifugeuse_id, numero, libelle } = parsed.data;
  const result = await sql`
    INSERT INTO programmes (centrifugeuse_id, numero, libelle)
    VALUES (${centrifugeuse_id}, ${numero}, ${libelle})
    RETURNING id, centrifugeuse_id, numero, libelle
  `;
  return NextResponse.json(result[0], { status: 201 });
}
