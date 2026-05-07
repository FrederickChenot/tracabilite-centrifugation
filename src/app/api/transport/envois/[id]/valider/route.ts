import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[valider] id reçu:', id);

    const check = await sql`
      SELECT id, statut FROM envois_transport WHERE id = ${id}
    `;
    console.log('[valider] envoi trouvé:', check);

    if (check.length === 0) {
      return NextResponse.json({ error: 'Envoi non trouvé' }, { status: 404 });
    }

    const result = await sql`
      UPDATE envois_transport
      SET statut = 'valide', valide_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    console.log('[valider] résultat UPDATE:', result);

    return NextResponse.json({ success: true, envoi: result[0] });
  } catch (error) {
    console.error('[valider] ERREUR EXACTE:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
