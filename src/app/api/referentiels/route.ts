import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { CentrifugeusesAvecProgrammes, Programme } from '@/lib/schemas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const site_id = searchParams.get('site_id');

  if (!site_id || isNaN(Number(site_id))) {
    return NextResponse.json({ error: 'site_id requis' }, { status: 400 });
  }

  const centrifugeuses = await sql`
    SELECT c.id, c.site_id, c.nom, c.modele, c.est_backup,
           p.id as prog_id, p.numero, p.libelle
    FROM centrifugeuses c
    LEFT JOIN programmes p ON p.centrifugeuse_id = c.id
    WHERE c.site_id = ${Number(site_id)} AND c.actif = true
    ORDER BY c.est_backup ASC, c.nom ASC, p.numero ASC
  `;

  const centriMap = new Map<number, CentrifugeusesAvecProgrammes>();

  for (const row of centrifugeuses) {
    if (!centriMap.has(row.id)) {
      centriMap.set(row.id, {
        id: row.id,
        site_id: row.site_id,
        nom: row.nom,
        modele: row.modele,
        est_backup: row.est_backup,
        actif: row.actif,
        programmes: [],
      });
    }
    if (row.prog_id) {
      centriMap.get(row.id)!.programmes.push({
        id: row.prog_id,
        centrifugeuse_id: row.id,
        numero: row.numero,
        libelle: row.libelle,
      } as Programme);
    }
  }

  return NextResponse.json({ centrifugeuses: Array.from(centriMap.values()) });
}
