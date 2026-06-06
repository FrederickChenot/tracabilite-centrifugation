import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import sql from '@/lib/db';

type ExtUser = {
  role?: string;
  site_id?: number | null;
  nom?: string | null;
  prenom?: string | null;
  must_change_password?: boolean;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        matricule: { label: 'Matricule', type: 'text' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        console.log('LOGIN matricule:', credentials?.matricule);

        if (!credentials?.matricule || !credentials?.password) return null;

        try {
          const rows = await sql`
            SELECT * FROM users
            WHERE matricule = ${credentials.matricule as string} AND actif = true
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
            must_change_password: Boolean(user.must_change_password),
          };
        } catch (err) {
          console.error('[auth] authorize error:', err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as ExtUser;
        token.role = u.role ?? '';
        token.site_id = u.site_id ?? null;
        token.nom = u.nom ?? null;
        token.prenom = u.prenom ?? null;
        token.must_change_password = u.must_change_password ?? false;
        // Stocker l'id en INTEGER dans le token (user.id est String(DB_id) ou '0' pour admin)
        token.id = Number(user.id ?? '0');
      }
      return token;
    },
    async session({ session, token }) {
      const u = session.user as ExtUser & { id?: number };
      u.role = token.role as string;
      u.site_id = token.site_id as number | null;
      u.nom = token.nom as string | null;
      u.prenom = token.prenom as string | null;
      u.must_change_password = (token.must_change_password as boolean) ?? false;
      // token.id est le number stocké dans le jwt callback (fallback sur token.sub pour anciens tokens)
      u.id = typeof token.id === 'number' ? token.id : Number(token.sub ?? '0');
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
