import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const CreateSiteSchema = z.object({ nom: z.string().min(1).max(50) });

async function ensureSitesActif() {
  await sql`ALTER TABLE sites ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true`;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    await ensureSitesActif();
    const sites = await sql`SELECT id, nom, actif FROM sites ORDER BY id`;
    return NextResponse.json({ sites });
  } catch (err) {
    console.error('[GET /api/admin/sites]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = CreateSiteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    await ensureSitesActif();
    const result = await sql`
      INSERT INTO sites (nom, actif) VALUES (${parsed.data.nom}, true) RETURNING *
    `;
    return NextResponse.json({ success: true, site: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/sites]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
