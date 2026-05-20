// Run: node --env-file=.env.local scripts/migrate.mjs
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Applying migration...');

  await sql`ALTER TABLE centrifugeuses ADD COLUMN IF NOT EXISTS ordre INT`;
  console.log('✓ centrifugeuses.ordre');

  await sql`ALTER TABLE tubes_centri ADD COLUMN IF NOT EXISTS stockage VARCHAR(10) CHECK (stockage IN ('ambiant','+5','-20'))`;
  console.log('✓ tubes_centri.stockage');

  await sql`ALTER TABLE sessions_centri ALTER COLUMN stockage DROP NOT NULL`;
  console.log('✓ sessions_centri.stockage nullable');

  console.log('Migration complete.');
}

migrate().catch((err) => { console.error(err); process.exit(1); });
