'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import InactivityGuard from '@/components/InactivityGuard';
import MarkdownEditor from '@/components/tickets/MarkdownEditor';

/* ── Constants ─────────────────────────────────────────────────── */

const SITES = [
  { id: 'epinal',      nom: 'Épinal' },
  { id: 'remiremont',  nom: 'Remiremont' },
  { id: 'neufchateau', nom: 'Neufchâteau' },
];

const PRIORITES = [
  { id: 'basse',   label: 'Basse' },
  { id: 'normale', label: 'Normale' },
  { id: 'haute',   label: 'Haute' },
  { id: 'urgente', label: 'Urgente' },
];

/* ── Types ─────────────────────────────────────────────────────── */

type User = {
  id: number;
  nom: string | null;
  prenom: string | null;
  email: string;
  role: string;
  actif: boolean;
};

type ExtUser = {
  id?: string;
  role?: string;
};

/* ── Page ───────────────────────────────────────────────────────── */

export default function NouveauTicketPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user as ExtUser | undefined;
  const isAdmin = currentUser?.role === 'admin';

  const [siteId, setSiteId] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState('normale');
  const [site, setSite] = useState('epinal');
  const [echeance, setEcheance] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  const [users, setUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/users')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUsers((data.users ?? []).filter((u: User) => u.actif));
      })
      .catch(() => {});
  }, [isAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) {
      setError('Le titre est obligatoire');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: titre.trim(),
          description: description.trim() || null,
          priorite,
          site,
          echeance: echeance || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? data.detail ?? 'Erreur lors de la création');
        return;
      }

      const { ticket } = await res.json();

      if (selectedUsers.length > 0) {
        await fetch(`/api/tickets/${ticket.id}/assigner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: selectedUsers }),
        });
      }

      router.push('/tickets');
    } catch {
      setError('Erreur inattendue côté client');
    } finally {
      setSubmitting(false);
    }
  }

  function toggleUser(userId: number) {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <InactivityGuard />
      <Sidebar
        siteId={siteId}
        onSiteChange={setSiteId}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100"
            aria-label="Ouvrir le menu"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/tickets" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
            ← Tickets
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm md:text-base font-bold text-gray-900">Nouveau ticket</h1>
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Titre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Titre du ticket..."
                  maxLength={200}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Description — éditeur markdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <MarkdownEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Description du problème ou de la demande..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priorité */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Priorité
                  </label>
                  <select
                    value={priorite}
                    onChange={(e) => setPriorite(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {PRIORITES.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Site */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Site
                  </label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {SITES.map((s) => (
                      <option key={s.id} value={s.id}>{s.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date d'échéance */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Date d&apos;échéance
                  <span className="text-xs font-normal text-gray-400 ml-2">optionnel</span>
                </label>
                <input
                  type="date"
                  value={echeance}
                  onChange={(e) => setEcheance(e.target.value)}
                  className="w-full sm:w-48 text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Assignés — admin uniquement */}
              {isAdmin && users.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Assignés
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {users.map((u) => {
                      const fullName = `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || u.email;
                      const checked = selectedUsers.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            checked ? 'bg-teal-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUser(u.id)}
                            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-semibold flex-shrink-0">
                              {((u.prenom ?? '').charAt(0) + (u.nom ?? '').charAt(0)).toUpperCase() || '?'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{fullName}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {u.role === 'admin' ? 'Admin' : 'Tech.'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedUsers.length > 0 && (
                    <p className="text-xs text-teal-600 mt-1">
                      {selectedUsers.length} utilisateur{selectedUsers.length > 1 ? 's' : ''} sélectionné{selectedUsers.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Link
                  href="/tickets"
                  className="px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Création en cours...' : 'Créer le ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
