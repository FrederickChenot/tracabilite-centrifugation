import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { CreateSessionSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { site_id, centri_id, prog_id, stockage, visa } = parsed.data;

  const result = await sql`
    INSERT INTO sessions_centri (site_id, centri_id, prog_id, stockage, visa)
    VALUES (${site_id}, ${centri_id}, ${prog_id}, ${stockage}, ${visa})
    RETURNING id
  `;

  return NextResponse.json({ session_id: result[0].id }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const site_id = searchParams.get('site_id');

  const sessions = await sql`
    SELECT s.*, c.nom as centri_nom, p.libelle as prog_libelle, p.numero as prog_numero
    FROM sessions_centri s
    LEFT JOIN centrifugeuses c ON c.id = s.centri_id
    LEFT JOIN programmes p ON p.id = s.prog_id
    WHERE ${site_id ? sql`s.site_id = ${Number(site_id)}` : sql`1=1`}
    ORDER BY s.opened_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ sessions });
}
