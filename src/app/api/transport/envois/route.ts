import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS laboratoires_dest (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    email_reception VARCHAR(100),
    actif BOOLEAN DEFAULT true
  )`;
  await sql`CREATE TABLE IF NOT EXISTS envois_transport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id INT REFERENCES sites(id),
    dest_id INT REFERENCES laboratoires_dest(id),
    visa_expediteur VARCHAR(10) NOT NULL,
    statut VARCHAR(20) DEFAULT 'en_preparation'
      CHECK (statut IN ('en_preparation','valide','envoye','receptionne')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    valide_at TIMESTAMPTZ,
    envoye_at TIMESTAMPTZ,
    receptionne_at TIMESTAMPTZ,
    nom_transporteur VARCHAR(100),
    visa_transporteur VARCHAR(10),
    nom_receptionnaire VARCHAR(100),
    visa_receptionnaire VARCHAR(10)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS envoi_sachets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    envoi_id UUID REFERENCES envois_transport(id) ON DELETE CASCADE,
    temperature VARCHAR(10) NOT NULL CHECK (temperature IN ('ambiant','+4','congele')),
    code_barre VARCHAR(100) NOT NULL,
    ordre INT NOT NULL DEFAULT 1,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    await ensureTables();
    const { searchParams } = new URL(request.url);
    const site_id = searchParams.get('site_id');
    const date = searchParams.get('date') ?? new Date().toLocaleDateString('fr-CA');

    const rows = await sql`
      SELECT e.id, e.site_id, e.dest_id, e.visa_expediteur, e.statut,
             e.created_at, e.valide_at, e.envoye_at, e.receptionne_at,
             e.nom_transporteur, e.visa_transporteur, e.nom_receptionnaire, e.visa_receptionnaire,
             s.nom AS site_nom, l.nom AS dest_nom
      FROM envois_transport e
      JOIN sites s ON s.id = e.site_id
      JOIN laboratoires_dest l ON l.id = e.dest_id
      WHERE (${site_id}::int IS NULL OR e.site_id = ${site_id ? Number(site_id) : null}::int)
        AND DATE(e.created_at AT TIME ZONE 'Europe/Paris') = ${date}::date
      ORDER BY e.created_at DESC
    `;

    const envoisWithSachets = await Promise.all(
      rows.map(async (e) => {
        const sachets = await sql`
          SELECT id, envoi_id, temperature, code_barre, ordre, scanned_at
          FROM envoi_sachets WHERE envoi_id = ${e.id as string}
          ORDER BY temperature, ordre
        `;
        return { ...e, sachets };
      })
    );

    return NextResponse.json({ envois: envoisWithSachets });
  } catch (err) {
    console.error('[GET /api/transport/envois]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    await ensureTables();
    const body = await request.json();
    const { site_id, dest_id, visa_expediteur } = body as {
      site_id: number; dest_id: number; visa_expediteur: string;
    };
    if (!site_id || !dest_id || !visa_expediteur) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }
    const result = await sql`
      INSERT INTO envois_transport (site_id, dest_id, visa_expediteur)
      VALUES (${site_id}, ${dest_id}, ${visa_expediteur.trim().toUpperCase()})
      RETURNING *
    `;
    return NextResponse.json({ envoi: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transport/envois]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
