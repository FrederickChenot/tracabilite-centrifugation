import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const existing = await sql`SELECT id FROM users WHERE matricule = 'D00001' LIMIT 1`;
    if (existing.length > 0) {
      return Response.json({ message: 'Compte démo déjà existant' });
    }

    const hash = await bcrypt.hash('LABO', 10);

    await sql`
      INSERT INTO users (matricule, prenom, nom, email, role, password_hash, actif)
      VALUES ('D00001', 'Demo', 'Labo', 'demo@biolabtrack.fr', 'technicien', ${hash}, true)
    `;

    return Response.json({ message: 'Compte démo créé' }, { status: 201 });
  } catch (error) {
    console.error('Erreur seed-demo:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
