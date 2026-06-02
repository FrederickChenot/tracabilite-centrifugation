import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const CreateSiteSchema = z.object({ nom: z.string().min(1).max(100) });

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const sites = await sql`SELECT id, nom, actif FROM sites ORDER BY nom`;
    return NextResponse.json({ sites });
  } catch (err) {
    console.error('[GET /api/admin/sites]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = CreateSiteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const id = slugify(parsed.data.nom);
    if (!id) return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });

    const result = await sql`
      INSERT INTO sites (id, nom, actif)
      VALUES (${id}, ${parsed.data.nom}, true)
      ON CONFLICT (id) DO NOTHING
      RETURNING id, nom, actif
    `;
    if (!result[0]) {
      return NextResponse.json({ error: 'Un site avec cet identifiant existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: true, site: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/sites]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
