'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LandingPage() {
  const [form, setForm] = useState({ nom: '', email: '', etablissement: '', nb_sites: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleContact(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setSent(true);
      else setSendError("Erreur lors de l'envoi. Réessayez plus tard.");
    } catch {
      setSendError('Erreur réseau.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">BioLabTrack</span>
          </div>
          <div className="hidden md:flex items-center gap-6 flex-1">
            <a href="#fonctionnalites" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Tarifs</a>
            <a href="#contact" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Link
              href="/app"
              className="text-sm px-4 py-2 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-700 transition-colors whitespace-nowrap shrink-0"
            >
              Accès laboratoire →
            </Link>
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded text-gray-600 hover:bg-gray-100"
              aria-label="Menu"
            >
              {mobileNavOpen ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Menu mobile déroulant */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3">
            <a href="#fonctionnalites" onClick={() => setMobileNavOpen(false)} className="text-sm text-gray-700 py-2 hover:text-teal-600 transition-colors">Fonctionnalités</a>
            <a href="#tarifs" onClick={() => setMobileNavOpen(false)} className="text-sm text-gray-700 py-2 hover:text-teal-600 transition-colors">Tarifs</a>
            <a href="#contact" onClick={() => setMobileNavOpen(false)} className="text-sm text-gray-700 py-2 hover:text-teal-600 transition-colors">Contact</a>
            <Link href="/mentions-legales" className="text-sm text-gray-700 py-2 hover:text-teal-600 transition-colors">Mentions légales</Link>
            <Link href="/cgu" className="text-sm text-gray-700 py-2 hover:text-teal-600 transition-colors">CGU</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-16 md:pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full text-xs text-teal-700 font-medium mb-8">
          Conçu pour et par les professionnels du labo
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          La traçabilité laboratoire<br />
          <span className="text-teal-600">enfin simple et fiable</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Centrifugation, transport, recherche inter-sites —<br className="hidden md:block" />
          conçu pour les laboratoires de biologie médicale des CH et GCS.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/app"
            className="px-8 py-3.5 bg-teal-600 text-white rounded-xl font-semibold text-base hover:bg-teal-700 transition-colors shadow-sm"
          >
            Accès laboratoire →
          </Link>
          <a
            href="#fonctionnalites"
            className="px-8 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-base hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            En savoir plus
          </a>
        </div>
      </section>

      {/* ── FONCTIONNALITES ── */}
      <section id="fonctionnalites" className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Tout ce dont votre labo a besoin</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Une seule plateforme pour toute votre traçabilité, accessible depuis n&apos;importe quel poste.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: '🔬',
                title: 'Traçabilité centrifugation',
                desc: 'Scan code-barres, sessions multi-tubes, historique horodaté, export PDF conforme COFRAC',
              },
              {
                icon: '🚚',
                title: 'Suivi transport',
                desc: "Bon de transport numérique avec QR code, validation transporteur sur smartphone, confirmation réception, emails automatiques",
              },
              {
                icon: '🔍',
                title: 'Recherche inter-sites',
                desc: "Retrouvez n'importe quel tube en 2 secondes, recherche par N°, date, opérateur, site",
              },
              {
                icon: '📄',
                title: 'Audit COFRAC',
                desc: 'Génération de rapports PDF en un clic, données certifiées, traçabilité complète',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POUR QUI ── */}
      <section id="pourqui" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Conçu pour les professionnels du labo</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Adapté à la réalité du terrain des laboratoires hospitaliers.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '🏥',
                title: 'Centres Hospitaliers',
                desc: 'Remplacez vos Excel par une solution web accessible depuis tous vos postes',
              },
              {
                icon: '🔗',
                title: 'GCS de Biologie',
                desc: 'Partagez la traçabilité entre vos sites, recherche inter-laboratoires en temps réel',
              },
              {
                icon: '📋',
                title: 'Responsables Qualité',
                desc: 'Préparez vos audits COFRAC sereinement, exports PDF prêts à présenter',
              },
            ].map((p) => (
              <div key={p.title} className="text-center p-6">
                <div className="text-4xl mb-4">{p.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{p.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TARIFS ── */}
      <section id="tarifs" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Tarifs simples et transparents</h2>
          <p className="text-gray-500 text-center mb-12">Essai gratuit 30 jours, sans carte bancaire</p>
          <div className="grid md:grid-cols-3 gap-6 items-start">

            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">STARTER</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-gray-900">49€</span>
                <span className="text-gray-400 text-sm">/mois HT</span>
              </div>
              <ul className="space-y-2.5 mb-8">
                {['1 site laboratoire', 'Module Centrifugation', 'Module Transport', 'Export PDF audit', 'Support email', 'Essai gratuit 30 jours'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-teal-500 font-bold text-xs">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#contact" className="block text-center px-4 py-3 border-2 border-teal-600 text-teal-600 rounded-xl font-semibold text-sm hover:bg-teal-50 transition-colors">
                Démarrer l&apos;essai gratuit →
              </a>
            </div>

            <div className="bg-teal-600 rounded-2xl p-8 text-white relative shadow-lg">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-teal-700 text-xs font-bold px-4 py-1 rounded-full shadow">
                Le plus populaire
              </div>
              <h3 className="text-xs font-bold text-teal-200 uppercase tracking-wider mb-2">GCS</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold">129€</span>
                <span className="text-teal-200 text-sm">/mois HT</span>
              </div>
              <ul className="space-y-2.5 mb-8">
                {["Jusqu'à 5 sites", 'Tous les modules', 'Recherche inter-sites', 'Dashboard administration', 'Gestion multi-utilisateurs', 'Support prioritaire', 'Essai gratuit 30 jours'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/90">
                    <span className="font-bold text-xs">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#contact" className="block text-center px-4 py-3 bg-white text-teal-700 rounded-xl font-semibold text-sm hover:bg-teal-50 transition-colors">
                Démarrer l&apos;essai gratuit →
              </a>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">RÉSEAU</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-extrabold text-gray-900">À partir de 300€</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">/mois HT</p>
              <ul className="space-y-2.5 mb-8">
                {['Sites illimités', 'GHT et réseaux régionaux', 'Branding personnalisé', 'Formation incluse', 'SLA garanti', 'Intégration SIL'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-teal-500 font-bold text-xs">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#contact" className="block text-center px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
                Demander un devis →
              </a>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm mt-8 space-x-4">
            <span>✓ Sans engagement</span>
            <span>✓ Résiliable à tout moment</span>
            <span>✓ Données hébergées en Europe</span>
          </p>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Intéressé ? Parlons-en</h2>
          <p className="text-gray-500 text-center mb-2">
            Répondons à vos questions, organisons une démonstration
          </p>
          <p className="text-center mb-10">
            <a href="mailto:contact@biolabtrack.fr" className="text-teal-600 hover:underline text-sm">contact@biolabtrack.fr</a>
          </p>
          {sent ? (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-10 text-center">
              <div className="text-4xl mb-4">✓</div>
              <h3 className="text-lg font-bold text-teal-800 mb-2">Message envoyé !</h3>
              <p className="text-teal-600 text-sm">Nous vous répondrons dans les meilleurs délais.</p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                  <input
                    type="text" required value={form.nom}
                    onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Marie Dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email professionnel *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="m.dupont@ch-exemple.fr"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Établissement / GCS *</label>
                  <input
                    type="text" required value={form.etablissement}
                    onChange={(e) => setForm((p) => ({ ...p, etablissement: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="CH de Exemple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de sites</label>
                  <input
                    type="number" min={1} value={form.nb_sites}
                    onChange={(e) => setForm((p) => ({ ...p, nb_sites: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  rows={4} value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder="Votre question ou besoin..."
                />
              </div>
              {sendError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sendError}</p>
              )}
              <button
                type="submit" disabled={sending}
                className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: '#085041' }} className="text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">B</span>
                </div>
                <span className="font-bold text-base">BioLabTrack</span>
              </div>
              <p className="text-sm text-white/60">Traçabilité laboratoire</p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-white/70">
              <a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a>
              <a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
              <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
              <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
            </div>
            <div className="text-sm text-white/60">
              <p className="font-semibold text-white mb-1">© 2026 BioLabTrack — Tous droits réservés</p>
              <p>Solution de traçabilité pour la biologie médicale</p>
              <a href="mailto:contact@biolabtrack.fr" className="mt-2 block text-white/70 hover:text-white transition-colors">
                contact@biolabtrack.fr
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
