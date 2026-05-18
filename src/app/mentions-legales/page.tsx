import Link from 'next/link';

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="text-sm text-teal-600 hover:underline">← Retour à l&apos;accueil</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16 prose prose-sm prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mentions légales</h1>
        <p className="text-gray-400 text-sm mb-10">Dernière mise à jour : mai 2026</p>

        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">1. Éditeur du site</h2>
        <p className="text-gray-600">
          BioLabTrack est édité par :<br />
          <strong>Fred Chenot</strong> — Technicien de Laboratoire Médical<br />
          Email : fredchenot@gmail.com
        </p>

        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">2. Hébergement</h2>
        <p className="text-gray-600">
          <strong>Application web :</strong> Vercel Inc. — 340 Pine Street, Suite 701, San Francisco, CA 94104, USA<br />
          <strong>Base de données :</strong> Neon Inc. — hébergement PostgreSQL serverless, conforme RGPD
        </p>

        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">3. Propriété intellectuelle</h2>
        <p className="text-gray-600">
          L&apos;ensemble du contenu de ce site (textes, interfaces, code source) est la propriété exclusive de l&apos;éditeur.
          Toute reproduction, totale ou partielle, est interdite sans autorisation préalable.
        </p>

        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">4. Données personnelles (RGPD)</h2>
        <p className="text-gray-600">
          Les données collectées (adresse email, nom, données de traçabilité) sont utilisées uniquement dans le cadre du service BioLabTrack.
          Elles ne sont ni vendues ni transmises à des tiers. Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données.
          Pour exercer ces droits, contactez : fredchenot@gmail.com
        </p>

        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">5. Cookies</h2>
        <p className="text-gray-600">
          Ce site utilise uniquement des cookies de session nécessaires au fonctionnement du service (authentification).
          Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.
        </p>

        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-3">6. Responsabilité</h2>
        <p className="text-gray-600">
          L&apos;éditeur s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations. Il ne saurait être tenu responsable
          des erreurs ou omissions, ni des dommages directs ou indirects résultant de l&apos;utilisation du service.
        </p>
      </div>
    </div>
  );
}
