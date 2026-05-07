import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  if ((session.user as { role?: string })?.role !== 'admin') {
    redirect('/outils/centrifugation');
  }

  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
