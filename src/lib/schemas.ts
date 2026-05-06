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
}

export interface Centrifugeuse {
  id: number;
  site_id: number;
  nom: string;
  modele: string;
  est_backup: boolean;
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
