import { put, del } from '@vercel/blob';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 });
    }

    const ticketResult = await sql`SELECT id, pieces_jointes FROM tickets WHERE id = ${id}`;
    if (ticketResult.length === 0) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const safeFilename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const blob = await put(`tickets/${id}/${safeFilename}`, file, { access: 'public' });

    const user = session.user as { prenom?: string; nom?: string; email?: string };
    const uploaderName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || (user.email ?? '');

    const pieceJointe: PieceJointe = {
      id: crypto.randomUUID(),
      nom: file.name,
      url: blob.url,
      type: file.type || 'application/octet-stream',
      taille: file.size,
      uploaded_le: new Date().toISOString(),
      uploaded_par: uploaderName,
    };

    const currentPieces = (ticketResult[0].pieces_jointes as PieceJointe[] | null) ?? [];
    const updatedPieces = [...currentPieces, pieceJointe];

    await sql`
      UPDATE tickets
      SET pieces_jointes = ${JSON.stringify(updatedPieces)},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    const userRow = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (userRow.length > 0) {
      await sql`
        INSERT INTO ticket_historique (id, ticket_id, user_id, action, nouvelle_valeur)
        VALUES (gen_random_uuid(), ${id}, ${userRow[0].id as number}, 'piece_jointe', ${file.name})
      `.catch(() => {});
    }

    return NextResponse.json({ pieceJointe }, { status: 201 });
  } catch (error) {
    console.error('[tickets/upload POST] ERREUR:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const pieceId = searchParams.get('pieceId');

    if (!pieceId) {
      return NextResponse.json({ error: 'pieceId requis' }, { status: 400 });
    }

    const ticketResult = await sql`SELECT id, pieces_jointes FROM tickets WHERE id = ${id}`;
    if (ticketResult.length === 0) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    const currentPieces = (ticketResult[0].pieces_jointes as PieceJointe[] | null) ?? [];
    const piece = currentPieces.find((p) => p.id === pieceId);
    if (!piece) {
      return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 });
    }

    const sessionUser = session.user as { prenom?: string; nom?: string; email?: string; role?: string };
    const currentUserName = `${sessionUser.prenom ?? ''} ${sessionUser.nom ?? ''}`.trim() || (sessionUser.email ?? '');
    const isAdmin = sessionUser.role === 'admin';

    if (!isAdmin && piece.uploaded_par !== currentUserName) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await del(piece.url).catch(() => {});

    const updatedPieces = currentPieces.filter((p) => p.id !== pieceId);

    await sql`
      UPDATE tickets
      SET pieces_jointes = ${JSON.stringify(updatedPieces)},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tickets/upload DELETE] ERREUR:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
