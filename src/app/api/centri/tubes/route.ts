import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { AddTubeSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = AddTubeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { session_id, num_echant, stockage } = parsed.data;

  const sessionCheck = await sql`
    SELECT id, statut FROM sessions_centri WHERE id = ${session_id}
  `;

  if (sessionCheck.length === 0) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }
  if (sessionCheck[0].statut === 'cloturee') {
    return NextResponse.json({ error: 'Session clôturée' }, { status: 409 });
  }

  const result = await sql`
    INSERT INTO tubes_centri (session_id, num_echant, stockage)
    VALUES (${session_id}, ${num_echant}, ${stockage ?? null})
    RETURNING id, session_id, num_echant, scanned_at, stockage
  `;

  return NextResponse.json(result[0], { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');

  if (!session_id) {
    return NextResponse.json({ error: 'session_id requis' }, { status: 400 });
  }

  const tubes = await sql`
    SELECT id, session_id, num_echant, scanned_at, stockage
    FROM tubes_centri
    WHERE session_id = ${session_id}
    ORDER BY scanned_at ASC
  `;

  return NextResponse.json({ tubes });
}
