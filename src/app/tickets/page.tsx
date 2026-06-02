'use client';

import { useState, useEffect, useCallback } from 'react';
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
  echeance: string | null;
  created_at: string;
  updated_at: string | null;
  assignes: Assigne[];
};

type ColumnDef = {
  id: string;
  label: string;
  headerCls: string;
  dropCls: string;
  accentCls: string;
};

type ExtUser = {
  id?: string;
  role?: string;
  nom?: string | null;
  prenom?: string | null;
};

/* ── Constants ─────────────────────────────────────────────────── */

const COLUMNS = [
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
] as const;

const PRIORITY: Record<string, { label: string; cls: string }> = {
  basse:   { label: 'Basse',   cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  normale: { label: 'Normale', cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
  haute:   { label: 'Haute',   cls: 'bg-orange-100 text-orange-700 border border-orange-200' },
  urgente: { label: 'Urgente', cls: 'bg-red-100 text-red-700 border border-red-200' },
};

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
  if (diffDays < 0) return { label: 'Dépassée', cls: 'bg-red-100 text-red-700 border border-red-200' };
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

  return (
    <div
      className={`bg-white rounded-lg border p-3 select-none transition-shadow ${
        isAnnule ? 'opacity-60 border-gray-200' : 'border-gray-200'
      } ${isDraggingOverlay ? 'shadow-2xl rotate-1 scale-105' : 'shadow-sm'}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${p.cls}`}>
          {p.label}
        </span>
        <span className="text-xs text-gray-400 shrink-0">{fmtDate(ticket.created_at)}</span>
      </div>

      <p className="text-sm font-medium text-gray-800 leading-snug mb-2 line-clamp-2">
        {ticket.titre}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 truncate">{ticket.site}</span>
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
      {/* Échéance */}
      {ticket.echeance && (() => {
        const badge = echeanceBadge(ticket.echeance);
        return badge ? (
          <div className="mt-1.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>
              ⏱ {badge.label}
            </span>
          </div>
        ) : null;
      })()}
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
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border ${col.headerCls}`}
      >
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${col.accentCls}`} />
        <span className="text-sm font-semibold text-gray-700">{col.label}</span>
        <span className="ml-auto text-xs font-medium text-gray-500 bg-white/80 rounded-full px-1.5 py-0.5 border border-gray-200/60">
          {tickets.length}
        </span>
        {isDisabled && (
          <span className="text-xs text-gray-400 italic">admin</span>
        )}
      </div>

      {/* Drop zone */}
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

/* ── Main page ─────────────────────────────────────────────────── */

export default function TicketsPage() {
  const { data: session } = useSession();
  const user = session?.user as ExtUser | undefined;
  const isAdmin = user?.role === 'admin';

  const [siteId, setSiteId] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  function handleDragStart({ active }: DragStartEvent) {
    const t = tickets.find((tk) => tk.id === String(active.id));
    if (t) setActiveTicket(t);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTicket(null);
    if (!over) return;

    const newStatut = String(over.id);
    const ticketId = String(active.id);
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

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header (mobile + desktop) */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
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
          <Link
            href="/tickets/nouveau"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            <span className="hidden sm:inline">Nouveau ticket</span>
          </Link>
        </div>

        {/* Board */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Chargement...
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4">
              <div
                className="flex gap-4 h-full"
                style={{ minWidth: `${(isAdmin ? COLUMNS.length : COLUMNS.length - 1) * 256}px` }}
              >
                {COLUMNS.filter((col) => isAdmin || col.id !== 'annule').map((col) => (
                  <DroppableColumn
                    key={col.id}
                    col={col}
                    tickets={tickets.filter((t) => t.statut === col.id)}
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
