'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import InactivityGuard from '@/components/InactivityGuard';
import { Centrifugeuse } from '@/lib/schemas';

const SITES = [
  { id: 1, label: 'Épinal' },
  { id: 2, label: 'Remiremont' },
  { id: 3, label: 'Neufchâteau' },
];

interface ArchiveSession {
  id: string;
  site_id: number;
  centri_id: number;
  prog_id: number;
  stockage: string | null;
  visa: string;
  opened_at: string;
  closed_at: string | null;
  statut: string;
  centri_nom: string;
  prog_libelle: string;
  prog_numero: number;
  site_nom: string;
  nb_tubes: number;
  echantillons: string[];
  tubes: { id: string; num_echant: string; scanned_at: string; stockage?: string | null }[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const STOCKAGE_LABEL: Record<string, string> = { ambiant: 'Ambiant', '+5': '+5°C', '-20': '-20°C' };
const stockageBadgeCls: Record<string, string> = {
  ambiant: 'bg-orange-100 text-orange-700',
  '+5': 'bg-blue-100 text-blue-700',
  '-20': 'bg-purple-100 text-purple-700',
};

function exportCsv(sessions: ArchiveSession[]) {
  const headers = ['Date', 'Heure', 'Site', 'Centrifugeuse', 'Programme', 'Visa', 'Statut', 'Nb tubes', 'Échantillons'];
  const rows = sessions.map((s) => [
    fmtDate(s.opened_at),
    fmtTime(s.opened_at),
    `"${s.site_nom}"`,
    `"${s.centri_nom}"`,
    `"Pgm ${s.prog_numero} ${s.prog_libelle}"`,
    s.visa,
    s.statut,
    s.nb_tubes,
    `"${(s.echantillons ?? []).join(';')}"`,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `archives-centri-${new Date().toLocaleDateString('fr-CA')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(sessions: ArchiveSession[], siteName: string) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.width;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(14, 110, 86);
  doc.text('GCS Bio Med — Archives Centrifugation', pageW / 2, 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`${siteName} — Généré le ${new Date().toLocaleString('fr-FR')}`, pageW / 2, 22, { align: 'center' });

  autoTable(doc, {
    startY: 28,
    head: [['Date', 'Heure', 'Site', 'Centrifugeuse', 'Programme', 'Stockage', 'Visa', 'Statut', 'Tubes', 'Échantillons']],
    body: sessions.map((s) => [
      fmtDate(s.opened_at),
      fmtTime(s.opened_at),
      s.site_nom,
      s.centri_nom,
      `Pgm ${s.prog_numero} — ${s.prog_libelle}`,
      s.stockage ? (STOCKAGE_LABEL[s.stockage] ?? s.stockage) : '—',
      s.visa,
      s.statut === 'ouverte' ? 'En cours' : 'Clôturée',
      s.nb_tubes,
      (s.echantillons ?? []).join(', '),
    ]),
    styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [14, 110, 86], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 20 }, 1: { cellWidth: 16 }, 2: { cellWidth: 20 },
      3: { cellWidth: 28 }, 4: { cellWidth: 42 }, 5: { cellWidth: 18 },
      6: { cellWidth: 12 }, 7: { cellWidth: 18 }, 8: { cellWidth: 10 },
      9: { cellWidth: 'auto' },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`Page ${i} / ${pageCount} — BioTools Archives`, pageW / 2, doc.internal.pageSize.height - 5, { align: 'center' });
  }
  doc.save(`archives-centri-${new Date().toLocaleDateString('fr-CA')}.pdf`);
}

export default function ArchivesCentrifugationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSiteId, setSidebarSiteId] = useState(1);

  /* Filters */
  const [filterSiteId, setFilterSiteId] = useState('');
  const [filterCentriId, setFilterCentriId] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [filterVisa, setFilterVisa] = useState('');

  /* Data */
  const [centrifugeuses, setCentrifugeuses] = useState<Centrifugeuse[]>([]);
  const [sessions, setSessions] = useState<ArchiveSession[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadCentrifugeuses = useCallback(async (siteId: string) => {
    if (!siteId) { setCentrifugeuses([]); return; }
    const res = await fetch(`/api/admin/centrifugeuses?site_id=${siteId}`);
    const data = await res.json();
    setCentrifugeuses(data.centrifugeuses ?? []);
  }, []);

  useEffect(() => {
    setCentrifugeuses([]);
    setFilterCentriId('');
    loadCentrifugeuses(filterSiteId);
  }, [filterSiteId, loadCentrifugeuses]);

  async function search(p = 0) {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (filterSiteId)   params.set('site_id',    filterSiteId);
      if (filterCentriId) params.set('centri_id',  filterCentriId);
      if (filterDateDebut) params.set('date_debut', filterDateDebut);
      if (filterDateFin)   params.set('date_fin',   filterDateFin);
      if (filterVisa.trim()) params.set('visa',    filterVisa.trim());
      params.set('page', String(p));
      const res = await fetch(`/api/centri/archives?${params}`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleExportPdf() {
    setGeneratingPdf(true);
    try {
      const siteName = SITES.find((s) => String(s.id) === filterSiteId)?.label ?? 'Tous les sites';
      await exportPdf(sessions, siteName);
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <InactivityGuard />
      <Sidebar siteId={sidebarSiteId} onSiteChange={setSidebarSiteId} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 rounded text-gray-500 hover:bg-gray-100">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Archives Centrifugation</h1>
          {sessions.length > 0 && (
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => exportCsv(sessions)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
              >
                CSV
              </button>
              <button
                onClick={handleExportPdf}
                disabled={generatingPdf}
                className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-60 transition-colors"
              >
                {generatingPdf ? 'PDF...' : 'PDF'}
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto p-4 space-y-4">
          {/* Filtres */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Filtres</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
                <select value={filterSiteId} onChange={(e) => setFilterSiteId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="">Tous</option>
                  {SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Centrifugeuse</label>
                <select value={filterCentriId} onChange={(e) => setFilterCentriId(e.target.value)}
                  disabled={!filterSiteId}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400">
                  <option value="">Toutes</option>
                  {centrifugeuses.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
                <input type="date" value={filterDateDebut} onChange={(e) => setFilterDateDebut(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
                <input type="date" value={filterDateFin} onChange={(e) => setFilterDateFin(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Visa</label>
                <input type="text" value={filterVisa} onChange={(e) => setFilterVisa(e.target.value.toUpperCase())}
                  placeholder="ex: FD" maxLength={5}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
            </div>
            <button onClick={() => search(0)} disabled={loading}
              className="mt-3 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded hover:bg-teal-700 disabled:opacity-40 transition-colors">
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>

          {/* Résultats */}
          {searched && !loading && sessions.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Aucun résultat</div>
          )}

          {sessions.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-3 text-xs text-gray-500">
                <span>{total} session{total !== 1 ? 's' : ''} au total</span>
                {pages > 1 && <span>Page {page + 1} / {pages}</span>}
              </div>

              {/* Mobile : cards */}
              <div className="md:hidden flex flex-col divide-y divide-gray-100">
                {sessions.map((s) => (
                  <div key={s.id} className="p-3 cursor-pointer active:bg-gray-50" onClick={() => toggleExpand(s.id)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-500">{fmtDate(s.opened_at)} {fmtTime(s.opened_at)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.statut === 'ouverte' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.statut === 'ouverte' ? 'En cours' : 'Clôturée'}
                      </span>
                    </div>
                    <p className="font-medium text-sm text-gray-800">{s.centri_nom}</p>
                    <p className="text-xs text-gray-500">{s.site_nom} · Pgm {s.prog_numero} · {s.visa}</p>
                    {expanded.has(s.id) && s.tubes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.tubes.map((t) => (
                          <span key={t.id} className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.num_echant}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop : tableau */}
              <table className="hidden md:table w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Date</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Site</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Centrifugeuse</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">Programme</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 w-20">Stockage</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 w-12">Visa</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 w-16">Tubes</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 w-28">Statut</th>
                    <th className="py-2 px-3 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, idx) => (
                    <>
                      <tr
                        key={s.id}
                        className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                        onClick={() => toggleExpand(s.id)}
                      >
                        <td className="py-2 px-3 font-mono text-gray-500">
                          {fmtDate(s.opened_at)}
                          <span className="block text-gray-400">{fmtTime(s.opened_at)}</span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{s.site_nom}</td>
                        <td className="py-2 px-3 font-medium text-gray-800">{s.centri_nom}</td>
                        <td className="py-2 px-3 text-gray-600 max-w-[180px]">
                          <span className="font-bold text-gray-700">Pgm {s.prog_numero}</span>
                          <span className="block text-gray-500 truncate" title={s.prog_libelle}>{s.prog_libelle}</span>
                        </td>
                        <td className="py-2 px-3">
                          {s.stockage ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${stockageBadgeCls[s.stockage] ?? 'bg-gray-100 text-gray-600'}`}>
                              {STOCKAGE_LABEL[s.stockage] ?? s.stockage}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-gray-700">{s.visa}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center justify-center rounded-full text-white font-bold text-xs"
                            style={{ background: '#0F6E56', width: 22, height: 22 }}>
                            {s.nb_tubes}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${s.statut === 'ouverte' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.statut === 'ouverte' ? 'En cours' : 'Clôturée'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-400 text-xs">{expanded.has(s.id) ? '▲' : '▼'}</td>
                      </tr>
                      {expanded.has(s.id) && (
                        <tr key={`${s.id}-detail`} className="bg-teal-50/50 border-b border-gray-100">
                          <td colSpan={9} className="px-8 py-3">
                            {s.tubes.length === 0 ? (
                              <p className="text-xs text-gray-400">Aucun tube</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {s.tubes.map((t) => (
                                  <span key={t.id} className="inline-flex items-center gap-1 font-mono text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700">
                                    {t.num_echant}
                                    {t.stockage && (
                                      <span className={`px-1 py-0 rounded text-xs ${stockageBadgeCls[t.stockage] ?? 'bg-gray-100 text-gray-500'}`}>
                                        {STOCKAGE_LABEL[t.stockage] ?? t.stockage}
                                      </span>
                                    )}
                                    <span className="text-gray-400">{fmtTime(t.scanned_at)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 p-3 border-t border-gray-200">
                  <button onClick={() => search(page - 1)} disabled={page === 0 || loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">
                    ← Précédent
                  </button>
                  <span className="text-sm text-gray-600">{page + 1} / {pages}</span>
                  <button onClick={() => search(page + 1)} disabled={page >= pages - 1 || loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">
                    Suivant →
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
