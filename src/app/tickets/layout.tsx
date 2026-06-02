import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tickets | BioLabTrack',
};

export default async function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
