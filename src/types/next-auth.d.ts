import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      site_id: number | null;
      nom: string | null;
      prenom: string | null;
      must_change_password: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: number;
    role: string;
    site_id: number | null;
    nom: string | null;
    prenom: string | null;
    must_change_password: boolean;
  }
}
