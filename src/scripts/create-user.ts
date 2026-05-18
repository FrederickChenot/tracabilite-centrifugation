import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { hash } from 'bcryptjs';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const email = process.env.SEED_USER_EMAIL || 'technicien.test@ch-epinal.fr';
  const password = process.env.SEED_USER_PASSWORD || 'BioLabTrack2026';
  const passwordHash = await hash(password, 12);

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    console.log(`Utilisateur ${email} existe déjà (id=${existing[0].id})`);
    process.exit(0);
  }

  const rows = await sql`
    INSERT INTO users (email, password_hash, nom, prenom, role, must_change_password, actif)
    VALUES (${email}, ${passwordHash}, 'Test', 'Technicien', 'technicien', false, true)
    RETURNING id, email, role
  `;

  console.log(`Utilisateur créé : ${rows[0].email}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
