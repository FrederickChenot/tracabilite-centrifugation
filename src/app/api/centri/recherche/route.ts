import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { RechercheResult } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const q          = searchParams.get('q')?.trim() || null;
  const site_id    = searchParams.get('site_id')   ? Number(searchParams.get('site_id'))   : null;
  const centri_id  = searchParams.get('centri_id') ? Number(searchParams.get('centri_id')) : null;
  const date_debut = searchParams.get('date_debut') || null;
  const date_fin   = searchParams.get('date_fin')   || null;
  const visa       = searchParams.get('visa')?.trim() || null;
  const stockage   = searchParams.get('stockage')   || null;
  const avec_remarque = searchParams.get('avec_remarque') === 'true';

  if (!q && !site_id && !centri_id && !date_debut && !date_fin && !visa && !stockage && !avec_remarque) {
    return NextResponse.json({ results: [] });
  }

  const rows = await sql`
    SELECT
      t.id,
      t.session_id,
      t.num_echant,
      t.scanned_at,
      t.remarque,
      s.opened_at,
      s.closed_at,
      s.statut,
      s.stockage,
      s.visa,
      c.nom  AS centrifugeuse,
      c.est_backup,
      p.numero AS prog_numero,
      p.libelle AS prog_libelle,
      si.nom AS site_nom,
      si.id  AS site_id
    FROM tubes_centri t
    JOIN sessions_centri s ON t.session_id = s.id
    JOIN centrifugeuses  c ON s.centri_id  = c.id
    JOIN programmes      p ON s.prog_id    = p.id
    JOIN sites          si ON s.site_id    = si.id
    WHERE
      ${q         ? sql`t.num_echant ILIKE ${'%' + q + '%'}`           : sql`TRUE`}
      AND ${site_id   ? sql`s.site_id  = ${site_id}`                   : sql`TRUE`}
      AND ${centri_id ? sql`s.centri_id = ${centri_id}`                : sql`TRUE`}
      AND ${date_debut ? sql`t.scanned_at::date >= ${date_debut}::date` : sql`TRUE`}
      AND ${date_fin   ? sql`t.scanned_at::date <= ${date_fin}::date`   : sql`TRUE`}
      AND ${visa    ? sql`s.visa ILIKE ${visa}`                         : sql`TRUE`}
      AND ${stockage ? sql`s.stockage = ${stockage}`                    : sql`TRUE`}
      AND ${avec_remarque ? sql`(t.remarque IS NOT NULL AND t.remarque != '')` : sql`TRUE`}
    ORDER BY t.scanned_at DESC
    LIMIT 500
  `;

  const results: RechercheResult[] = rows.map((r) => ({
    id:           r.id,
    session_id:   r.session_id,
    num_echant:   r.num_echant,
    scanned_at:   r.scanned_at,
    remarque:     r.remarque ?? null,
    opened_at:    r.opened_at,
    closed_at:    r.closed_at ?? null,
    statut:       r.statut,
    stockage:     r.stockage,
    visa:         r.visa,
    centrifugeuse: r.centrifugeuse,
    est_backup:   r.est_backup,
    prog_numero:  r.prog_numero,
    prog_libelle: r.prog_libelle,
    site_nom:     r.site_nom,
    site_id:      r.site_id,
  }));

  return NextResponse.json({ results });
}
