import sql from '@/lib/db';

export async function logAudit(
  userEmail: string | null,
  action: string,
  entity: string,
  entityId: string,
  siteId?: number,
  details?: object
) {
  try {
    await sql`
      INSERT INTO audit_logs (user_email, action, entity, entity_id, site_id, details)
      VALUES (
        ${userEmail},
        ${action},
        ${entity},
        ${entityId},
        ${siteId ?? null},
        ${details ? JSON.stringify(details) : null}
      )
    `;
  } catch (error) {
    console.error('[audit]', error);
  }
}
