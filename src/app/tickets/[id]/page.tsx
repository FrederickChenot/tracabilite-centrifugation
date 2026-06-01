'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import InactivityGuard from '@/components/InactivityGuard';

/* ── Types ─────────────────────────────────────────────────────── */

type Assigne = {
  user_id: number;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  assigne_le: string;
};

type Ticket = {
  id: string;
  titre: string;
  description: string | null;
  statut: string;
  priorite: string;
  cree_par: number;
  site: string;
  motif_annulation: string | null;
  created_at: string;
  updated_at: string | null;
  assignes: Assigne[];
};

type HistoriqueEntry = {
  id: string;
  ticket_id: string;
  user_id: number;
  action: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  commentaire: string | null;
  created_at: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
};

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
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
};

/* ── Constants ─────────────────────────────────────────────────── */

const STATUTS_TECH = [
  { id: 'a_faire',  label: 'À faire' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'termine',  label: 'Terminé' },
];

const PRIORITES = [
  { id: 'basse',   label: 'Basse' },
  { id: 'normale', label: 'Normale' },
  { id: 'haute',   label: 'Haute' },
  { id: 'urgente', label: 'Urgente' },
];

const STATUT_LABELS: Record<string, string> = {
  a_faire:  'À faire',
  en_cours: 'En cours',
  termine:  'Terminé',
  annule:   'Annulé',
};

const PRIORITE_BADGE: Record<string, string> = {
  basse:   'bg-gray-100 text-gray-600 border border-gray-200',
  normale: 'bg-blue-100 text-blue-700 border border-blue-200',
  haute:   'bg-orange-100 text-orange-700 border border-orange-200',
  urgente: 'bg-red-100 text-red-700 border border-red-200',
};

const STATUT_BADGE: Record<string, string> = {
  a_faire:  'bg-gray-100 text-gray-700',
  en_cours: 'bg-blue-100 text-blue-700',
  termine:  'bg-green-100 text-green-700',
  annule:   'bg-red-100 text-red-700',
};

const ACTION_CONFIG: Record<string, { label: string; icon: string; iconCls: string }> = {
  creation:            { label: 'Ticket créé',         icon: '●', iconCls: 'text-green-500' },
  changement_statut:   { label: 'Statut modifié',      icon: '⇄', iconCls: 'text-blue-500' },
  changement_priorite: { label: 'Priorité modifiée',   icon: '↕', iconCls: 'text-orange-500' },
  assignation:         { label: 'Utilisateur assigné', icon: '+', iconCls: 'text-teal-500 font-bold' },
  desassignation:      { label: 'Utilisateur retiré',  icon: '−', iconCls: 'text-gray-400 font-bold' },
  commentaire:         { label: 'Commentaire',         icon: '◎', iconCls: 'text-indigo-500' },
  annulation:          { label: 'Ticket annulé',       icon: '✕', iconCls: 'text-red-500' },
};

/* ── Helpers ───────────────────────────────────────────────────── */

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function initials(prenom: string | null, nom: string | null): string {
  const p = (prenom ?? '').charAt(0).toUpperCase();
  const n = (nom ?? '').charAt(0).toUpperCase();
  return (p + n) || '?';
}

/* ── Page ───────────────────────────────────────────────────────── */

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user as ExtUser | undefined;
  const isAdmin = currentUser?.role === 'admin';

  const [siteId, setSiteId] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  /* Form state */
  const [statut, setStatut] = useState('');
  const [priorite, setPriorite] = useState('');
  const [saving, setSaving] = useState(false);

  /* Assignés */
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [savingAssignes, setSavingAssignes] = useState(false);

  /* Commentaire */
  const [commentaire, setCommentaire] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  /* Modal annulation */
  const [showAnnulerModal, setShowAnnulerModal] = useState(false);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [annuling, setAnnuling] = useState(false);

  /* Toast */
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* Load ticket + historique */
  const loadTicket = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    console.log('ticket id:', ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      console.log('API response status:', res.status, res.ok);

      if (res.status === 404) {
        router.push('/tickets');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        console.log('ticket data:', data);
        setTicket(data.ticket);
        setHistorique(data.historique ?? []);
        setStatut(data.ticket.statut);
        setPriorite(data.ticket.priorite);
        const assignedIds = (data.ticket.assignes ?? []).map((a: Assigne) => a.user_id);
        setSelectedUsers(assignedIds);
      } else {
        const errData = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        const msg = errData.error ?? errData.detail ?? `Erreur ${res.status}`;
        console.error('API error:', res.status, errData);
        setFetchError(msg);
      }
    } catch (err) {
      console.error('fetch exception:', err);
      setFetchError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [ticketId, router]);

  /* Load users list (admin only) */
  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers((data.users ?? []).filter((u: User) => u.actif));
    }
  }, [isAdmin]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* Save statut / priorité */
  async function handleSaveChanges() {
    if (!ticket) return;
    if (statut === ticket.statut && priorite === ticket.priorite) return;
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (statut !== ticket.statut) body.statut = statut;
      if (priorite !== ticket.priorite) body.priorite = priorite;
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        setStatut(data.ticket.statut);
        setPriorite(data.ticket.priorite);
        showToast('Modifications enregistrées');
        await loadTicket();
      } else {
        showToast('Erreur lors de la sauvegarde', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  /* Save assignés */
  async function handleSaveAssignes() {
    setSavingAssignes(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assigner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedUsers }),
      });
      if (res.ok) {
        showToast('Assignés mis à jour');
        await loadTicket();
      } else {
        showToast('Erreur lors de la mise à jour', 'error');
      }
    } finally {
      setSavingAssignes(false);
    }
  }

  /* Add comment */
  async function handleAddComment() {
    if (!commentaire.trim()) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/commenter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaire: commentaire.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setHistorique((prev) => [
          ...prev,
          {
            ...data.historique,
            nom: currentUser?.nom ?? null,
            prenom: currentUser?.prenom ?? null,
            email: currentUser?.email ?? null,
          },
        ]);
        setCommentaire('');
        showToast('Commentaire ajouté');
      } else {
        showToast('Erreur lors de l\'ajout', 'error');
      }
    } finally {
      setAddingComment(false);
    }
  }

  /* Annuler ticket */
  async function handleAnnuler() {
    if (!motifAnnulation.trim()) return;
    setAnnuling(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/annuler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif: motifAnnulation.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        setStatut('annule');
        setShowAnnulerModal(false);
        setMotifAnnulation('');
        showToast('Ticket annulé');
        await loadTicket();
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Erreur lors de l\'annulation', 'error');
      }
    } finally {
      setAnnuling(false);
    }
  }

  function toggleUser(userId: number) {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  const hasChanges = ticket && (statut !== ticket.statut || priorite !== ticket.priorite);
  const isAnnule = ticket?.statut === 'annule';

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar siteId={1} onSiteChange={() => {}} mobileOpen={false} onMobileClose={() => {}} />
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          Chargement...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar siteId={1} onSiteChange={() => {}} mobileOpen={false} onMobileClose={() => {}} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <p className="text-sm font-semibold text-red-600">
            {fetchError ?? 'Ticket introuvable'}
          </p>
          <Link href="/tickets" className="text-sm text-teal-600 hover:underline">
            ← Retour aux tickets
          </Link>
        </div>
      </div>
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

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Modal annulation */}
      {showAnnulerModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAnnulerModal(false); }}
        >
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Annuler le ticket</h2>
              <p className="text-sm text-gray-500 mt-1">
                Cette action est irréversible. Les assignés seront notifiés.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Motif d&apos;annulation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motifAnnulation}
                  onChange={(e) => setMotifAnnulation(e.target.value)}
                  placeholder="Expliquez la raison de l'annulation..."
                  rows={3}
                  autoFocus
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAnnulerModal(false); setMotifAnnulation(''); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAnnuler}
                  disabled={!motifAnnulation.trim() || annuling}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {annuling ? 'Annulation...' : 'Confirmer l\'annulation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <h1 className="text-sm md:text-base font-bold text-gray-900 truncate flex-1 min-w-0">
            {ticket.titre}
          </h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${STATUT_BADGE[ticket.statut] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUT_LABELS[ticket.statut] ?? ticket.statut}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">

            {/* Ticket info card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${PRIORITE_BADGE[ticket.priorite] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ticket.priorite.charAt(0).toUpperCase() + ticket.priorite.slice(1)}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {ticket.site}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Créé le {fmtDate(ticket.created_at)}
                </span>
                {ticket.updated_at && (
                  <span className="text-xs text-gray-400">
                    · Modifié le {fmtDateTime(ticket.updated_at)}
                  </span>
                )}
              </div>

              {ticket.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}

              {isAnnule && ticket.motif_annulation && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-0.5">Motif d&apos;annulation</p>
                  <p className="text-sm text-red-600">{ticket.motif_annulation}</p>
                </div>
              )}
            </div>

            {/* Modification statut + priorité */}
            {!isAnnule && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                  Modifier
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Statut</label>
                    <select
                      value={statut}
                      onChange={(e) => setStatut(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {STATUTS_TECH.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priorité</label>
                    <select
                      value={priorite}
                      onChange={(e) => setPriorite(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {PRIORITES.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving || !hasChanges}
                    className="px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAnnulerModal(true)}
                      className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors ml-auto"
                    >
                      Annuler le ticket
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Assignés */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                Assignés
              </h2>

              {/* Current assignees (read-only for tech) */}
              {ticket.assignes.length === 0 && !isAdmin && (
                <p className="text-sm text-gray-400 italic">Aucun assigné</p>
              )}

              {ticket.assignes.length > 0 && !isAdmin && (
                <div className="flex flex-wrap gap-2">
                  {ticket.assignes.map((a) => (
                    <div
                      key={a.user_id}
                      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-1 pr-3 py-1"
                    >
                      <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-semibold">
                        {initials(a.prenom, a.nom)}
                      </span>
                      <span className="text-sm text-gray-700">
                        {`${a.prenom ?? ''} ${a.nom ?? ''}`.trim() || (a.email ?? '')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Editable assignees (admin) */}
              {isAdmin && users.length > 0 && (
                <>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mb-3">
                    {users.map((u) => {
                      const fullName = `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || u.email;
                      const checked = selectedUsers.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                            checked ? 'bg-teal-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUser(u.id)}
                            className="w-4 h-4 text-teal-600 rounded border-gray-300"
                          />
                          <span
                            className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-semibold flex-shrink-0"
                          >
                            {((u.prenom ?? '').charAt(0) + (u.nom ?? '').charAt(0)).toUpperCase() || '?'}
                          </span>
                          <span className="text-sm text-gray-700 flex-1 truncate">{fullName}</span>
                          <span className="text-xs text-gray-400">{u.email}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleSaveAssignes}
                    disabled={savingAssignes}
                    className="px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors"
                  >
                    {savingAssignes ? 'Mise à jour...' : 'Mettre à jour les assignés'}
                  </button>
                </>
              )}

              {isAdmin && users.length === 0 && (
                <p className="text-sm text-gray-400 italic">Chargement des utilisateurs...</p>
              )}
            </div>

            {/* Commentaires */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                Ajouter un commentaire
              </h2>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Votre commentaire..."
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y mb-3"
              />
              <button
                onClick={handleAddComment}
                disabled={addingComment || !commentaire.trim()}
                className="px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {addingComment ? 'Ajout en cours...' : 'Ajouter'}
              </button>
            </div>

            {/* Historique */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                Historique
              </h2>

              {historique.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucune activité</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {historique.map((entry) => {
                      const cfg = ACTION_CONFIG[entry.action] ?? {
                        label: entry.action,
                        icon: '·',
                        iconCls: 'text-gray-400',
                      };
                      const acteur = `${entry.prenom ?? ''} ${entry.nom ?? ''}`.trim() || (entry.email ?? 'Inconnu');
                      return (
                        <div key={entry.id} className="flex gap-3 relative pl-8">
                          {/* Icon dot */}
                          <div
                            className={`absolute left-2 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold z-10 ${cfg.iconCls}`}
                          >
                            {cfg.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="text-sm font-semibold text-gray-800">{acteur}</span>
                              <span className="text-xs text-gray-500">{cfg.label}</span>
                              <span className="text-xs text-gray-400 ml-auto">
                                {fmtDateTime(entry.created_at)}
                              </span>
                            </div>

                            {/* Changement valeur */}
                            {entry.ancienne_valeur && entry.nouvelle_valeur && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                <span className="line-through text-gray-400">{entry.ancienne_valeur}</span>
                                {' → '}
                                <span className="font-medium text-gray-700">{entry.nouvelle_valeur}</span>
                              </p>
                            )}
                            {entry.ancienne_valeur && !entry.nouvelle_valeur && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Retiré : <span className="text-gray-600">{entry.ancienne_valeur}</span>
                              </p>
                            )}
                            {!entry.ancienne_valeur && entry.nouvelle_valeur && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Ajouté : <span className="font-medium text-gray-700">{entry.nouvelle_valeur}</span>
                              </p>
                            )}

                            {/* Commentaire */}
                            {entry.commentaire && entry.action === 'commentaire' && (
                              <div className="mt-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.commentaire}</p>
                              </div>
                            )}

                            {/* Motif annulation */}
                            {entry.commentaire && entry.action === 'annulation' && (
                              <div className="mt-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                <p className="text-xs font-medium text-red-700 mb-0.5">Motif</p>
                                <p className="text-sm text-red-600">{entry.commentaire}</p>
                              </div>
                            )}

                            {/* Commentaire création */}
                            {entry.commentaire && entry.action === 'creation' && (
                              <p className="text-xs text-gray-400 mt-0.5">{entry.commentaire}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
