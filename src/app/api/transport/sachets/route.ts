import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const body = await request.json();
    const { envoi_id, temperature, code_barre } = body as {
      envoi_id: string; temperature: string; code_barre: string;
    };
    if (!envoi_id || !temperature || !code_barre) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }
    const maxOrdre = await sql`
      SELECT COALESCE(MAX(ordre), 0) as max_ordre FROM envoi_sachets WHERE envoi_id = ${envoi_id}
    `;
    const ordre = Number(maxOrdre[0].max_ordre) + 1;
    const result = await sql`
      INSERT INTO envoi_sachets (envoi_id, temperature, code_barre, ordre)
      VALUES (${envoi_id}, ${temperature}, ${code_barre.trim()}, ${ordre})
      RETURNING *
    `;
    return NextResponse.json({ sachet: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transport/sachets]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
