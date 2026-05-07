import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import sql from '@/lib/db';

type ExtUser = {
  role?: string;
  site_id?: number | null;
  nom?: string | null;
  prenom?: string | null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Admin from environment
        if (
          credentials.email === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: '0',
            email: process.env.ADMIN_EMAIL as string,
            name: 'Administrateur',
            role: 'admin',
            site_id: null,
            nom: 'Administrateur',
            prenom: '',
          };
        }

        // DB users
        try {
          const rows = await sql`
            SELECT id, email, password_hash, nom, prenom, site_id, role
            FROM users
            WHERE email = ${credentials.email as string} AND actif = true
            LIMIT 1
          `;
          const user = rows[0];
          if (!user) return null;

          const valid = await compare(credentials.password as string, user.password_hash as string);
          if (!valid) return null;

          return {
            id: String(user.id),
            email: user.email as string,
            name: `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || (user.email as string),
            role: user.role as string,
            site_id: user.site_id as number | null,
            nom: user.nom as string | null,
            prenom: user.prenom as string | null,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as ExtUser;
        token.role = u.role;
        token.site_id = u.site_id ?? null;
        token.nom = u.nom ?? null;
        token.prenom = u.prenom ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      const u = session.user as ExtUser & { id?: string };
      u.role = token.role as string;
      u.site_id = token.site_id as number | null;
      u.nom = token.nom as string | null;
      u.prenom = token.prenom as string | null;
      if (token.sub) u.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
