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
  console.log('[upload] POST — début');

  const session = await auth();
  if (!session) {
    console.log('[upload] POST — non autorisé');
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  console.log('[upload] POST — session OK, user:', session.user?.email);

  // Vérification token Blob
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error('[upload] POST — BLOB_READ_WRITE_TOKEN absent de process.env');
    return NextResponse.json({ error: 'Configuration Blob manquante (token absent)' }, { status: 500 });
  }
  console.log('[upload] POST — BLOB token présent, préfixe:', blobToken.slice(0, 20) + '...');

  try {
    const { id } = await params;
    console.log('[upload] POST — ticket id:', id);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    console.log('[upload] POST — fichier reçu:', file?.name, '| taille:', file?.size, '| type:', file?.type);

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 });
    }

    // Vérification colonne pieces_jointes en DB
    console.log('[upload] POST — requête DB ticket...');
    const ticketResult = await sql`SELECT id, pieces_jointes FROM tickets WHERE id = ${id}`;
    if (ticketResult.length === 0) {
      console.log('[upload] POST — ticket introuvable:', id);
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }
    console.log('[upload] POST — ticket trouvé, pieces_jointes actuelles:', JSON.stringify(ticketResult[0].pieces_jointes));

    // Upload Vercel Blob
    const safeFilename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const blobPath = `tickets/${id}/${safeFilename}`;
    console.log('[upload] POST — upload Blob vers:', blobPath);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = await put(blobPath, buffer, {
      access: 'private',
      token: blobToken,
      contentType: file.type || 'application/octet-stream',
      addRandomSuffix: false,
    });
    console.log('[upload] POST — Blob OK, url:', blob.url);

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
    console.log('[upload] POST — UPDATE tickets pieces_jointes, count:', updatedPieces.length);

    await sql`
      UPDATE tickets
      SET pieces_jointes = ${JSON.stringify(updatedPieces)},
          updated_at = NOW()
      WHERE id = ${id}
    `;
    console.log('[upload] POST — DB UPDATE OK');

    const userRow = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (userRow.length > 0) {
      await sql`
        INSERT INTO ticket_historique (id, ticket_id, user_id, action, nouvelle_valeur)
        VALUES (gen_random_uuid(), ${id}, ${userRow[0].id as number}, 'piece_jointe', ${file.name})
      `.catch((histErr) => console.error('[upload] POST — historique insert échoué (non bloquant):', histErr));
    }

    console.log('[upload] POST — succès, retour pieceJointe');
    return NextResponse.json({ pieceJointe }, { status: 201 });

  } catch (error) {
    const err = error as Error;
    console.error('[upload] POST — ERREUR:', err?.message ?? err);
    console.error('[upload] POST — stack:', err?.stack);
    return NextResponse.json(
      { error: 'Erreur serveur', detail: err?.message ?? String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[upload] DELETE — début');

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const pieceId = searchParams.get('pieceId');
    console.log('[upload] DELETE — ticket:', id, '| pieceId:', pieceId);

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

    console.log('[upload] DELETE — suppression Blob url:', piece.url);
    await del(piece.url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }).catch((delErr) => console.error('[upload] DELETE — del Blob échoué (non bloquant):', delErr));

    const updatedPieces = currentPieces.filter((p) => p.id !== pieceId);
    await sql`
      UPDATE tickets
      SET pieces_jointes = ${JSON.stringify(updatedPieces)},
          updated_at = NOW()
      WHERE id = ${id}
    `;
    console.log('[upload] DELETE — succès');
    return NextResponse.json({ success: true });

  } catch (error) {
    const err = error as Error;
    console.error('[upload] DELETE — ERREUR:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Erreur serveur', detail: err?.message ?? String(error) },
      { status: 500 }
    );
  }
}
