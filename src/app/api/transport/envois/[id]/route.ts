import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await sql`
      SELECT e.*, s.nom AS site_nom, l.nom AS dest_nom, l.email_reception AS dest_email
      FROM envois_transport e
      JOIN sites s ON s.id = e.site_id
      JOIN laboratoires_dest l ON l.id = e.dest_id
      WHERE e.id = ${id}
      LIMIT 1
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    const sachets = await sql`
      SELECT * FROM envoi_sachets WHERE envoi_id = ${id} ORDER BY temperature, ordre
    `;
    return NextResponse.json({ envoi: { ...rows[0], sachets } });
  } catch (err) {
    console.error('[GET /api/transport/envois/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
