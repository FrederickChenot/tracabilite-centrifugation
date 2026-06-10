import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const rows = await sql`
      SELECT id FROM envois_transport
      WHERE code_acces = ${code.toUpperCase()}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 404 });
    }
    return NextResponse.json({ envoi_id: rows[0].id });
  } catch (err) {
    console.error('[GET /api/public/transport/[code]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
