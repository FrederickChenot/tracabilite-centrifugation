import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const CreateSiteSchema = z.object({ nom: z.string().min(1).max(50) });

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const sites = await sql`SELECT id, nom, actif FROM sites ORDER BY id`;
  return NextResponse.json({ sites });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const parsed = CreateSiteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await sql`
    INSERT INTO sites (nom) VALUES (${parsed.data.nom}) RETURNING id, nom, actif
  `;
  return NextResponse.json(result[0], { status: 201 });
}
