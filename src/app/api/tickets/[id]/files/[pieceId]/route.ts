import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

type PieceJointe = {
  id: string;
  nom: string;
  url: string;
  type: string;
  taille: number;
  uploaded_le: string;
  uploaded_par: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pieceId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { id, pieceId } = await params;
    console.log('[files GET] ticket:', id, 'pieceId:', pieceId);

    const ticketResult = await sql`SELECT pieces_jointes FROM tickets WHERE id = ${id}`;
    if (!ticketResult.length) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const pieces = (ticketResult[0].pieces_jointes as PieceJointe[] | null) ?? [];
    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece) {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error('[files GET] BLOB_READ_WRITE_TOKEN absent');
      return NextResponse.json({ error: 'Token Blob manquant' }, { status: 500 });
    }

    console.log('[files GET] fetch blob:', piece.url.slice(0, 60) + '...');

    const blobRes = await fetch(piece.url, {
      headers: { authorization: `Bearer ${token}` },
    });

    if (!blobRes.ok) {
      console.error('[files GET] blob inaccessible, HTTP', blobRes.status);
      return NextResponse.json({ error: 'Fichier inaccessible' }, { status: 404 });
    }

    const contentType = piece.type || blobRes.headers.get('content-type') || 'application/octet-stream';
    const inline = contentType.startsWith('image/') || contentType === 'application/pdf';
    const disposition = inline
      ? `inline; filename="${encodeURIComponent(piece.nom)}"`
      : `attachment; filename="${encodeURIComponent(piece.nom)}"`;

    console.log('[files GET] OK, type:', contentType, '| disposition:', disposition);

    return new NextResponse(blobRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': blobRes.headers.get('content-length') ?? '',
      },
    });

  } catch (error) {
    const err = error as Error;
    console.error('[files GET] ERREUR:', err?.message);
    console.error('[files GET] stack:', err?.stack);
    return NextResponse.json(
      { error: 'Erreur serveur', detail: err?.message ?? String(error) },
      { status: 500 }
    );
  }
}
