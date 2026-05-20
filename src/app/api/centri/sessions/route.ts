import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import sql from '@/lib/db';
import { CreateSessionSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { site_id, centri_id, prog_id, stockage, visa } = parsed.data;

  const user = session.user as { role?: string; site_id?: number | null };
  if (user.role !== 'admin' && user.site_id && user.site_id !== site_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await sql`
    INSERT INTO sessions_centri (site_id, centri_id, prog_id, stockage, visa)
    VALUES (${site_id}, ${centri_id}, ${prog_id}, ${stockage ?? null}, ${visa})
    RETURNING id
  `;

  const newId = String(result[0].id);
  await logAudit(session.user?.email ?? null, 'CREATE_SESSION', 'session', newId, site_id);

  return NextResponse.json({ session_id: result[0].id }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

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
