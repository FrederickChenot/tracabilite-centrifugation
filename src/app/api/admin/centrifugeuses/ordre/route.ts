import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { z } from 'zod';

const OrdreSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = OrdreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { ids } = parsed.data;
  await Promise.all(
    ids.map((id, index) =>
      sql`UPDATE centrifugeuses SET ordre = ${index + 1} WHERE id = ${id}`
    )
  );

  return NextResponse.json({ success: true });
}
