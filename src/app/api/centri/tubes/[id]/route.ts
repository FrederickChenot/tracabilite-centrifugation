import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const PatchTubeSchema = z.object({
  stockage: z.enum(['ambiant', '+5', '-20']).nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = PatchTubeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { stockage } = parsed.data;
  const result = await sql`
    UPDATE tubes_centri SET stockage = ${stockage} WHERE id = ${id}
    RETURNING id, stockage
  `;

  if (result.length === 0) return NextResponse.json({ error: 'Tube introuvable' }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;

  const result = await sql`
    DELETE FROM tubes_centri WHERE id = ${id} RETURNING id
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Tube introuvable' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
