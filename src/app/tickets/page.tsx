'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import Sidebar from '@/components/layout/Sidebar';
import InactivityGuard from '@/components/InactivityGuard';

/* ── Types ─────────────────────────────────────────────────────── */

type ChecklistItem = { id: string; texte: string; fait: boolean };

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
  createur_prenom: string | null;
  createur_nom: string | null;
  site: string;
  motif_annulation: string | null;
  echeance: string | null;
  created_at: string;
  updated_at: string | null;
  assignes: Assigne[];
  commentaires_count: number;
  checklist: ChecklistItem[] | null;
};

type ColumnDef = {
  id: string;
  label: string;
  headerCls: string;
  dropCls: string;
  accentCls: string;
};

type SortField = 'titre' | 'statut' | 'priorite' | 'echeance' | 'created_at';

type ExtUser = {
  id?: string;
  role?: string;
  nom?: string | null;
  prenom?: string | null;
};

/* ── Constants ─────────────────────────────────────────────────── */

const COLUMNS: ColumnDef[] = [
  {
    id: 'a_faire',
    label: 'À faire',
    headerCls: 'bg-gray-100 border-gray-200',
    dropCls: 'bg-gray-50 border-gray-200',
    accentCls: 'bg-gray-400',
  },
  {
    id: 'en_cours',
    label: 'En cours',
    headerCls: 'bg-blue-50 border-blue-200',
    dropCls: 'bg-blue-50/40 border-blue-200',
    accentCls: 'bg-blue-500',
  },
  {
    id: 'termine',
    label: 'Terminé',
    headerCls: 'bg-green-50 border-green-200',
    dropCls: 'bg-green-50/40 border-green-200',
    accentCls: 'bg-green-500',
  },
  {
    id: 'annule',
    label: 'Annulé',
    headerCls: 'bg-red-50 border-red-200',
    dropCls: 'bg-red-50/40 border-red-200',
    accentCls: 'bg-red-400',
  },
];

const PRIORITY: Record<string, { label: string; cls: string }> = {
  basse:   { label: 'Basse',   cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  normale: { label: 'Normale', cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
  haute:   { label: 'Haute',   cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  urgente: { label: 'Urgente', cls: 'bg-red-100 text-red-700 border border-red-200' },
};

const STATUT_LABELS: Record<string, string> = {
  a_faire:  'À faire',
  en_cours: 'En cours',
  termine:  'Terminé',
  annule:   'Annulé',
};

const STATUT_CLS: Record<string, string> = {
  a_faire:  'bg-gray-100 text-gray-700',
  en_cours: 'bg-blue-100 text-blue-700',
  termine:  'bg-green-100 text-green-700',
  annule:   'bg-red-100 text-red-700',
};

const SITE_LABELS: Record<string, string> = {
  epinal:      'Épinal',
  remiremont:  'Remiremont',
  neufchateau: 'Neufchâteau',
};

const PRIORITY_SORT: Record<string, number> = { urgente: 3, haute: 2, normale: 1, basse: 0 };

/* ── Helpers ───────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function echeanceBadge(echeance: string | null): { label: string; cls: string } | null {
  if (!echeance) return null;
  const [y, m, d] = echeance.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0)  return { label: 'Dépassée', cls: 'bg-red-100 text-red-700 border border-red-200' };
  if (diffDays <= 2) return { label: `J-${diffDays}`, cls: 'bg-orange-100 text-orange-700 border border-orange-200' };
  return {
    label: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
    cls: 'bg-gray-100 text-gray-400 border border-gray-200',
  };
}

function initials(prenom: string | null, nom: string | null): string {
  const p = (prenom ?? '').charAt(0).toUpperCase();
  const n = (nom ?? '').charAt(0).toUpperCase();
  return (p + n) || '?';
}

/* ── TicketCardContent ─────────────────────────────────────────── */

function TicketCardContent({
  ticket,
  isDraggingOverlay = false,
}: {
  ticket: Ticket;
  isDraggingOverlay?: boolean;
}) {
  const p = PRIORITY[ticket.priorite] ?? { label: ticket.priorite, cls: 'bg-gray-100 text-gray-600' };
  const isAnnule = ticket.statut === 'annule';
  const eBadge = echeanceBadge(ticket.echeance);

  const checklist = ticket.checklist ?? [];
  const clDone  = checklist.filter((i) => i.fait).length;
  const clTotal = checklist.length;

  const createur = `${ticket.createur_prenom ?? ''} ${ticket.createur_nom ?? ''}`.trim() || null;

  return (
    <div
      className={`bg-white rounded-lg border p-3 select-none transition-shadow ${
        isAnnule ? 'opacity-60 border-gray-200' : 'border-gray-200'
      } ${isDraggingOverlay ? 'shadow-2xl rotate-1 scale-105' : 'shadow-sm'}`}
    >
      {/* Priorité + date création */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${p.cls}`}>
          {p.label}
        </span>
        <span className="text-xs text-gray-400 shrink-0">{fmtDate(ticket.created_at)}</span>
      </div>

      {/* Titre */}
      <p className="text-sm font-medium text-gray-800 leading-snug mb-2 line-clamp-2">
        {ticket.titre}
      </p>

      {/* Site + Assignés */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs text-gray-500 truncate">{SITE_LABELS[ticket.site] ?? ticket.site}</span>
        {ticket.assignes.length > 0 && (
          <div className="flex gap-0.5 flex-shrink-0">
            {ticket.assignes.slice(0, 3).map((a) => (
              <span
                key={a.user_id}
                title={`${a.prenom ?? ''} ${a.nom ?? ''}`.trim() || (a.email ?? '')}
                className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-semibold"
              >
                {initials(a.prenom, a.nom)}
              </span>
            ))}
            {ticket.assignes.length > 3 && (
              <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] flex items-center justify-center font-semibold">
                +{ticket.assignes.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Méta bas : échéance + commentaires + checklist */}
      <div className="flex items-center gap-2 flex-wrap">
        {eBadge && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${eBadge.cls}`}>
            ⏱ {eBadge.label}
          </span>
        )}
        {ticket.commentaires_count > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {ticket.commentaires_count}
          </span>
        )}
        {clTotal > 0 && (
          <span className="text-[10px] text-gray-400">
            {clDone}/{clTotal}
          </span>
        )}
      </div>

      {/* Checklist progress bar */}
      {clTotal > 0 && (
        <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-teal-500 h-1 rounded-full transition-all"
            style={{ width: `${Math.round((clDone / clTotal) * 100)}%` }}
          />
        </div>
      )}

      {/* Créateur */}
      {createur && (
        <p className="text-[10px] text-gray-400 mt-1.5 truncate">par {createur}</p>
      )}
    </div>
  );
}

/* ── DraggableCard ─────────────────────────────────────────────── */

function DraggableCard({ ticket }: { ticket: Ticket }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? 'opacity-20' : ''
      }`}
    >
      <Link href={`/tickets/${ticket.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <TicketCardContent ticket={ticket} />
      </Link>
    </div>
  );
}

/* ── DroppableColumn ───────────────────────────────────────────── */

function DroppableColumn({
  col,
  tickets,
  isDisabled,
}: {
  col: ColumnDef;
  tickets: Ticket[];
  isDisabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id, disabled: isDisabled });

  return (
    <div className="flex flex-col min-w-[240px] flex-1">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border ${col.headerCls}`}>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${col.accentCls}`} />
        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
        <span className="ml-auto text-xs font-medium text-gray-500 bg-white/80 rounded-full px-1.5 py-0.5 border border-gray-200/60">
          {tickets.length}
        </span>
        {isDisabled && (
          <span className="text-xs text-gray-400 italic">admin</span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[280px] rounded-b-lg border border-t-0 p-2 flex flex-col gap-2 transition-colors duration-150 ${
          isOver && !isDisabled
            ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-300'
            : isOver && isDisabled
            ? 'bg-red-50 border-red-300 ring-1 ring-red-300'
            : col.dropCls
        }`}
      >
        {tickets.map((ticket) => (
          <DraggableCard key={ticket.id} ticket={ticket} />
        ))}
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-gray-400 italic">
            Aucun ticket
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ListView ──────────────────────────────────────────────────── */

function SortIcon({ field, sortBy, sortDir }: { field: SortField; sortBy: SortField; sortDir: 'asc' | 'desc' }) {
  if (field !== sortBy) return <span className="text-gray-300 ml-0.5">↕</span>;
  return <span className="text-teal-600 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function ListView({
  tickets,
  sortBy,
  sortDir,
  onSort,
}: {
  tickets: Ticket[];
  sortBy: SortField;
  sortDir: 'asc' | 'desc';
  onSort: (f: SortField) => void;
}) {
  const thCls = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none';

  return (
    <div className="flex-1 min-h-0 overflow-auto p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thCls} onClick={() => onSort('titre')}>
                Titre <SortIcon field="titre" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className={thCls} onClick={() => onSort('statut')}>
                Statut <SortIcon field="statut" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className={`${thCls} hidden sm:table-cell`} onClick={() => onSort('priorite')}>
                Priorité <SortIcon field="priorite" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className={`${thCls} hidden md:table-cell`}>
                Assignés
              </th>
              <th className={`${thCls} hidden lg:table-cell`} onClick={() => onSort('echeance')}>
                Échéance <SortIcon field="echeance" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className={`${thCls} hidden lg:table-cell`} onClick={() => onSort('created_at')}>
                Créé le <SortIcon field="created_at" sortBy={sortBy} sortDir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400 italic">
                  Aucun ticket
                </td>
              </tr>
            )}
            {tickets.map((t) => {
              const p = PRIORITY[t.priorite];
              const eBadge = echeanceBadge(t.echeance);
              return (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5">
                    <Link href={`/tickets/${t.id}`} className="font-medium text-gray-800 hover:text-teal-700 line-clamp-1">
                      {t.titre}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{SITE_LABELS[t.site] ?? t.site}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUT_CLS[t.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUT_LABELS[t.statut] ?? t.statut}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    {p && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${p.cls}`}>
                        {p.label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    {t.assignes.length > 0 ? (
                      <div className="flex gap-0.5">
                        {t.assignes.slice(0, 3).map((a) => (
                          <span
                            key={a.user_id}
                            title={`${a.prenom ?? ''} ${a.nom ?? ''}`.trim()}
                            className="w-6 h-6 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-semibold"
                          >
                            {initials(a.prenom, a.nom)}
                          </span>
                        ))}
                        {t.assignes.length > 3 && (
                          <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-[10px] flex items-center justify-center font-semibold">
                            +{t.assignes.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    {eBadge ? (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${eBadge.cls}`}>
                        {eBadge.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-gray-500">
                    {fmtDate(t.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */

export default function TicketsPage() {
  const { data: session } = useSession();
  const user = session?.user as ExtUser | undefined;
  const isAdmin = user?.role === 'admin';

  const [siteId, setSiteId]   = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // View
  const [view, setView] = useState<'board' | 'list'>('board');

  // Filters
  const [filterSite, setFilterSite]         = useState('');
  const [filterPriorite, setFilterPriorite] = useState('');
  const [filterAssigne, setFilterAssigne]   = useState('');

  // Sort (list view)
  const [sortBy, setSortBy]   = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Unique assignees across all tickets (for filter)
  const allAssignes = useMemo(() => {
    const map = new Map<string, Assigne>();
    for (const t of tickets) {
      for (const a of t.assignes) {
        if (!map.has(String(a.user_id))) map.set(String(a.user_id), a);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (`${a.prenom ?? ''} ${a.nom ?? ''}`).localeCompare(`${b.prenom ?? ''} ${b.nom ?? ''}`, 'fr')
    );
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterSite && t.site !== filterSite) return false;
      if (filterPriorite && t.priorite !== filterPriorite) return false;
      if (filterAssigne && !t.assignes.some((a) => String(a.user_id) === filterAssigne)) return false;
      return true;
    });
  }, [tickets, filterSite, filterPriorite, filterAssigne]);

  // Sorted for list view
  const listTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'titre':
          cmp = a.titre.localeCompare(b.titre, 'fr');
          break;
        case 'statut':
          cmp = a.statut.localeCompare(b.statut);
          break;
        case 'priorite':
          cmp = (PRIORITY_SORT[a.priorite] ?? 0) - (PRIORITY_SORT[b.priorite] ?? 0);
          break;
        case 'echeance':
          if (!a.echeance && !b.echeance) cmp = 0;
          else if (!a.echeance) cmp = 1;
          else if (!b.echeance) cmp = -1;
          else cmp = a.echeance.localeCompare(b.echeance);
          break;
        case 'created_at':
          cmp = a.created_at.localeCompare(b.created_at);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filteredTickets, sortBy, sortDir]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }

  function clearFilters() {
    setFilterSite('');
    setFilterPriorite('');
    setFilterAssigne('');
  }

  const activeFilters = [filterSite, filterPriorite, filterAssigne].filter(Boolean).length;

  function handleDragStart({ active }: DragStartEvent) {
    const t = tickets.find((tk) => tk.id === String(active.id));
    if (t) setActiveTicket(t);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTicket(null);
    if (!over) return;

    const newStatut  = String(over.id);
    const ticketId   = String(active.id);
    const currentTicket = tickets.find((t) => t.id === ticketId);

    if (!currentTicket || currentTicket.statut === newStatut) return;
    if (newStatut === 'annule' && !isAdmin) return;

    const prevTickets = [...tickets];
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, statut: newStatut } : t))
    );

    fetch(`/api/tickets/${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: newStatut }),
    })
      .then((res) => {
        if (!res.ok) {
          setTickets(prevTickets);
          showToast('Erreur lors du déplacement', 'error');
        }
      })
      .catch(() => {
        setTickets(prevTickets);
        showToast('Erreur réseau', 'error');
      });
  }

  const visibleColumns = isAdmin ? COLUMNS : COLUMNS.filter((c) => c.id !== 'annule');

  const selectCls = 'text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-gray-700';

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

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100"
              aria-label="Ouvrir le menu"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base md:text-lg font-bold text-gray-900">Tickets</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="hidden sm:flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setView('board')}
                title="Vue kanban"
                className={`p-1.5 ${view === 'board' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
              <button
                onClick={() => setView('list')}
                title="Vue liste"
                className={`p-1.5 border-l border-gray-200 ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Nouveau ticket */}
            <Link
              href="/tickets/nouveau"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Nouveau ticket</span>
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-2 bg-white border-b border-gray-100 shrink-0">
          <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} className={selectCls}>
            <option value="">Tous les sites</option>
            {Object.entries(SITE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>

          <select value={filterPriorite} onChange={(e) => setFilterPriorite(e.target.value)} className={selectCls}>
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITY).map(([id, p]) => (
              <option key={id} value={id}>{p.label}</option>
            ))}
          </select>

          <select value={filterAssigne} onChange={(e) => setFilterAssigne(e.target.value)} className={selectCls}>
            <option value="">Tous assignés</option>
            {allAssignes.map((a) => (
              <option key={a.user_id} value={String(a.user_id)}>
                {`${a.prenom ?? ''} ${a.nom ?? ''}`.trim() || (a.email ?? '')}
              </option>
            ))}
          </select>

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Effacer ({activeFilters})
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400">
            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Chargement...
          </div>
        ) : view === 'list' ? (
          <ListView
            tickets={listTickets}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4">
              <div
                className="flex gap-4 h-full"
                style={{ minWidth: `${visibleColumns.length * 256}px` }}
              >
                {visibleColumns.map((col) => (
                  <DroppableColumn
                    key={col.id}
                    col={col}
                    tickets={filteredTickets.filter((t) => t.statut === col.id)}
                    isDisabled={col.id === 'annule' && !isAdmin}
                  />
                ))}
              </div>
            </div>

            <DragOverlay>
              {activeTicket ? (
                <div className="w-60">
                  <TicketCardContent ticket={activeTicket} isDraggingOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
