import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';

function generateCodeAcces(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const l = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const d = Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  return `${l}-${d}`;
}

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
    statut VARCHAR(20) DEFAULT 'en_preparation',
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
    temperature VARCHAR(10) NOT NULL,
    code_barre VARCHAR(100) NOT NULL,
    ordre INT NOT NULL DEFAULT 1,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  /* Migrations idempotentes — sachets */
  await sql`ALTER TABLE IF EXISTS envoi_sachets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
  await sql`ALTER TABLE IF EXISTS envoi_sachets ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT NOW()`;

  /* Migrations idempotentes — envois_transport */
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS valide_at TIMESTAMPTZ`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS envoye_at TIMESTAMPTZ`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS receptionne_at TIMESTAMPTZ`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS nom_transporteur VARCHAR(100)`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS visa_transporteur VARCHAR(10)`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS nom_receptionnaire VARCHAR(100)`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS visa_receptionnaire VARCHAR(10)`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS matricule_expediteur VARCHAR(20)`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS code_acces VARCHAR(8) UNIQUE`;
  await sql`ALTER TABLE IF EXISTS envois_transport ADD COLUMN IF NOT EXISTS numero_bordereau VARCHAR(30)`;

  /* Fix constraint statut */
  try {
    await sql`ALTER TABLE envois_transport DROP CONSTRAINT IF EXISTS envois_transport_statut_check`;
    await sql`ALTER TABLE envois_transport ADD CONSTRAINT envois_transport_statut_check
      CHECK (statut IN ('en_preparation','valide','envoye','receptionne'))`;
  } catch (err) {
    console.warn('[ensureTables] constraint migration:', err);
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    await ensureTables();
    const { searchParams } = new URL(request.url);
    const site_id = searchParams.get('site_id');
    const date = searchParams.get('date');

    if (!site_id || !date) {
      return NextResponse.json({ error: 'site_id et date requis' }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        e.*,
        s.nom AS site_nom,
        d.nom  AS dest_nom,
        d.email_reception,
        COALESCE(
          json_agg(
            json_build_object(
              'id',          sa.id,
              'envoi_id',    sa.envoi_id,
              'temperature', sa.temperature,
              'code_barre',  sa.code_barre,
              'ordre',       sa.ordre,
              'scanned_at',  sa.scanned_at,
              'created_at',  sa.created_at
            ) ORDER BY sa.ordre
          ) FILTER (WHERE sa.id IS NOT NULL),
          '[]'::json
        ) AS sachets
      FROM envois_transport e
      JOIN sites               s  ON s.id  = e.site_id
      JOIN laboratoires_dest   d  ON d.id  = e.dest_id
      LEFT JOIN envoi_sachets  sa ON sa.envoi_id = e.id
      WHERE e.site_id = ${Number(site_id)}
        AND DATE(e.created_at AT TIME ZONE 'Europe/Paris') = ${date}::date
      GROUP BY e.id, s.nom, d.nom, d.email_reception
      ORDER BY e.created_at DESC
    `;

    return NextResponse.json({ envois: rows });
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
    const { site_id, dest_id, visa_expediteur, matricule_expediteur } = body as {
      site_id: number; dest_id: number; visa_expediteur: string; matricule_expediteur?: string;
    };
    if (!site_id || !dest_id || !visa_expediteur) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    // Generate unique code_acces, retry once on collision
    let code_acces = generateCodeAcces();
    try {
      const existing = await sql`SELECT id FROM envois_transport WHERE code_acces = ${code_acces} LIMIT 1`;
      if (existing.length > 0) code_acces = generateCodeAcces();
    } catch {
      // column may not exist yet on first run — ensureTables handles it
    }

    // Generate numero_bordereau TR-AAAA-MM-JJ-NNNN
    const today = new Date().toLocaleDateString('fr-CA');
    const [y, m, d] = today.split('-');
    let numero_bordereau = `TR-${y}-${m}-${d}-0001`;
    try {
      const cnt = await sql`
        SELECT COUNT(*)::int AS cnt FROM envois_transport
        WHERE DATE(created_at AT TIME ZONE 'Europe/Paris') = ${today}::date
      `;
      const seq = ((cnt[0]?.cnt as number) ?? 0) + 1;
      numero_bordereau = `TR-${y}-${m}-${d}-${String(seq).padStart(4, '0')}`;
    } catch { /* fallback already set */ }

    const result = await sql`
      INSERT INTO envois_transport (site_id, dest_id, visa_expediteur, matricule_expediteur, code_acces, numero_bordereau)
      VALUES (
        ${site_id},
        ${dest_id},
        ${visa_expediteur.trim().toUpperCase()},
        ${matricule_expediteur?.trim().toUpperCase() ?? null},
        ${code_acces},
        ${numero_bordereau}
      )
      RETURNING *
    `;
    return NextResponse.json({ envoi: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/transport/envois]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
