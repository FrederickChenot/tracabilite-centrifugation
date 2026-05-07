import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import sql from '@/lib/db';

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
          };
        }

        // DB users
        try {
          const rows = await sql`
            SELECT id, email, password_hash, nom, prenom, role
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
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    async session({ session, token }) {
      (session.user as { role?: string }).role = token.role as string;
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
