import Link from 'next/link';

export default function CguPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="text-sm text-teal-600 hover:underline">← Retour à l&apos;accueil</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-gray-400 text-sm mb-10">Dernière mise à jour : mai 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">1. Objet du service</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            BioLabTrack est un service SaaS de traçabilité pour laboratoires de biologie médicale. Il permet la gestion des sessions de centrifugation,
            le suivi des transports de prélèvements et la recherche inter-sites. L&apos;accès est réservé aux professionnels de santé habilitéss.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">2. Accès au service</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            L&apos;accès au service nécessite la création d&apos;un compte par l&apos;administrateur de l&apos;établissement.
            L&apos;utilisateur s&apos;engage à maintenir la confidentialité de ses identifiants et à ne pas les partager.
            Toute utilisation sous ses identifiants est de sa responsabilité.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">3. Données et confidentialité</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Les données de traçabilité saisies sont la propriété de l&apos;établissement utilisateur. L&apos;éditeur s&apos;engage à ne pas les exploiter
            à des fins commerciales. Les données sont stockées sur des serveurs sécurisés (Neon/Vercel) et font l&apos;objet de sauvegardes régulières.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">4. Responsabilités</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            L&apos;éditeur s&apos;engage à mettre en œuvre les moyens nécessaires pour assurer la disponibilité et la sécurité du service.
            L&apos;utilisateur est responsable de la conformité des données saisies avec les exigences de son établissement.
            L&apos;éditeur ne peut être tenu responsable des décisions prises sur la base des données enregistrées.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">5. Résiliation</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            L&apos;abonnement est résiliable à tout moment sans frais. Les données sont conservées 30 jours après la résiliation,
            puis définitivement supprimées. Un export des données peut être demandé avant résiliation.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">6. Modifications</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            L&apos;éditeur se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés par email
            de tout changement substantiel avec un préavis de 30 jours.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-3">7. Droit applicable</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Les présentes CGU sont soumises au droit français. En cas de litige, les parties s&apos;engagent à rechercher
            une solution amiable avant tout recours judiciaire. À défaut, les tribunaux compétents seront ceux du ressort
            du domicile de l&apos;éditeur.
          </p>
        </section>
      </div>
    </div>
  );
}
