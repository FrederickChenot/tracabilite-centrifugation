import { z } from 'zod';

export const CreateSessionSchema = z.object({
  site_id: z.number().int().positive(),
  centri_id: z.number().int().positive(),
  prog_id: z.number().int().positive(),
  stockage: z.enum(['ambiant', '+5', '-20']),
  visa: z.string().min(1).max(5),
});

export const AddTubeSchema = z.object({
  session_id: z.string().uuid(),
  num_echant: z.string().min(1).max(50),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type AddTubeInput = z.infer<typeof AddTubeSchema>;

export interface Site {
  id: number;
  nom: string;
  actif: boolean;
}

export interface Centrifugeuse {
  id: number;
  site_id: number;
  nom: string;
  modele: string;
  est_backup: boolean;
  actif: boolean;
}

export interface Programme {
  id: number;
  centrifugeuse_id: number;
  numero: number;
  libelle: string;
}

export interface CentrifugeusesAvecProgrammes extends Centrifugeuse {
  programmes: Programme[];
}

export interface Tube {
  id: string;
  session_id: string;
  num_echant: string;
  scanned_at: string;
}

export interface Session {
  id: string;
  site_id: number;
  centri_id: number;
  prog_id: number;
  stockage: 'ambiant' | '+5' | '-20';
  visa: string;
  opened_at: string;
  closed_at: string | null;
  statut: 'ouverte' | 'cloturee';
  centri_nom?: string;
  prog_libelle?: string;
  prog_numero?: number;
  tubes?: Tube[];
}

export interface HistoriqueSession extends Session {
  tubes: Tube[];
}

export interface RechercheResult {
  id: string;
  session_id: string;
  num_echant: string;
  scanned_at: string;
  remarque: string | null;
  opened_at: string;
  closed_at: string | null;
  statut: string;
  stockage: 'ambiant' | '+5' | '-20';
  visa: string;
  centrifugeuse: string;
  est_backup: boolean;
  prog_numero: number;
  prog_libelle: string;
  site_nom: string;
  site_id: number;
}

export interface FilterState {
  site_id: number | null;
  centri_id: number | null;
  date_debut: string;
  date_fin: string;
  visa: string;
  stockage: '' | 'ambiant' | '+5' | '-20';
  avec_remarque: boolean;
}

export interface LaboratoireDest {
  id: number;
  nom: string;
  email_reception: string | null;
  actif: boolean;
}

export type TemperatureTransport = 'ambiant' | '+4' | 'congele';

export interface EnvoiSachet {
  id: string;
  envoi_id: string;
  temperature: TemperatureTransport;
  code_barre: string;
  ordre: number;
  scanned_at: string;
}

export type StatutEnvoi = 'en_preparation' | 'valide' | 'envoye' | 'receptionne';

export interface EnvoiTransport {
  id: string;
  site_id: number;
  dest_id: number;
  visa_expediteur: string;
  statut: StatutEnvoi;
  created_at: string;
  valide_at: string | null;
  envoye_at: string | null;
  receptionne_at: string | null;
  nom_transporteur: string | null;
  visa_transporteur: string | null;
  nom_receptionnaire: string | null;
  visa_receptionnaire: string | null;
  site_nom?: string;
  dest_nom?: string;
  sachets?: EnvoiSachet[];
}
