import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await sql`
    DELETE FROM tubes_centri WHERE id = ${id} RETURNING id
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Tube introuvable' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
