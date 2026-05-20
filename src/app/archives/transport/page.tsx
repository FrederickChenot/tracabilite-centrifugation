'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import InactivityGuard from '@/components/InactivityGuard';
import { LaboratoireDest, Site } from '@/lib/schemas';
import { exportTransportPdf } from '@/lib/exportTransportPdf';

type HistoriqueRow = {
  id: string;
  created_at: string;
  site_nom: string;
  dest_nom: string;
  statut: string;
  visa_expediteur: string;
  nb_ambiant: number;
  nb_plus4: number;
  nb_congele: number;
  nb_total: number;
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '--';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '--' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(iso: string | null | undefined) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function statutBadge(statut: string) {
  const map: Record<string, { label: string; cls: string }> = {
    en_preparation: { label: 'En préparation', cls: 'bg-gray-100 text-gray-600' },
    valide:         { label: 'Validé',          cls: 'bg-orange-100 text-orange-700' },
    envoye:         { label: 'Pris en charge',  cls: 'bg-blue-100 text-blue-700' },
    receptionne:    { label: 'Réceptionné',     cls: 'bg-green-100 text-green-700' },
  };
  const s = map[statut] ?? { label: statut, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

function exportCsv(rows: HistoriqueRow[]) {
  const headers = ['Date', 'Heure', 'Expéditeur', 'Destinataire', 'Ambiant', '+5°C', 'Congelé', 'Total', 'Visa', 'Statut'];
  const body = rows.map((r) => [
    fmtDate(r.created_at), fmtTime(r.created_at),
    `"${r.site_nom}"`, `"${r.dest_nom}"`,
    r.nb_ambiant, r.nb_plus4, r.nb_congele, r.nb_total,
    r.visa_expediteur, r.statut,
  ]);
  const csv = [headers, ...body].map((r) => r.join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `archives-transport-${new Date().toLocaleDateString('fr-CA')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ArchivesTransportPage() {
  const [sidebarSiteId, setSidebarSiteId] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Filters */
  const [searchDateDebut, setSearchDateDebut] = useState('');
  const [searchDateFin, setSearchDateFin] = useState('');
  const [searchSiteId, setSearchSiteId] = useState('');
  const [searchDestId, setSearchDestId] = useState('');
  const [searchStatut, setSearchStatut] = useState('');
  const [searchVisa, setSearchVisa] = useState('');

  /* Data */
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratoires, setLaboratoires] = useState<LaboratoireDest[]>([]);
  const [results, setResults] = useState<HistoriqueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [modalEnvoiId, setModalEnvoiId] = useState<string | null>(null);

  const loadRef = useCallback(async () => {
    const [sitesRes, labsRes] = await Promise.all([
      fetch('/api/admin/sites'),
      fetch('/api/transport/laboratoires'),
    ]);
    const [sitesData, labsData] = await Promise.all([sitesRes.json(), labsRes.json()]);
    setSites(sitesData.sites ?? []);
    setLaboratoires(labsData.laboratoires ?? []);
  }, []);

  useEffect(() => { loadRef(); }, [loadRef]);

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (searchSiteId)    params.set('site_id',    searchSiteId);
      if (searchDestId)    params.set('dest_id',    searchDestId);
      if (searchStatut)    params.set('statut',     searchStatut);
      if (searchDateDebut) params.set('date_debut', searchDateDebut);
      if (searchDateFin)   params.set('date_fin',   searchDateFin);
      if (searchVisa)      params.set('visa',       searchVisa);
      const res = await fetch(`/api/transport/historique?${params}`);
      const data = await res.json();
      setResults(data.envois ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf(envoiId: string) {
    try {
      const res = await fetch(`/api/transport/envois/${envoiId}`);
      const data = await res.json();
      if (data.envoi) await exportTransportPdf(data.envoi);
    } catch {
      /* silently fail */
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <InactivityGuard />
      <Sidebar siteId={sidebarSiteId} onSiteChange={setSidebarSiteId} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* Modal bon */}
      {modalEnvoiId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalEnvoiId(null); }}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Bon de transport</h2>
              <button onClick={() => setModalEnvoiId(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe src={`/transport/${modalEnvoiId}`} className="w-full border-0 flex-1" style={{ minHeight: '60vh' }} title="Bon de transport" />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 rounded text-gray-500 hover:bg-gray-100">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Archives Transport</h1>
          {results.length > 0 && (
            <button onClick={() => exportCsv(results)}
              className="ml-auto px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors">
              CSV
            </button>
          )}
        </header>

        <main className="flex-1 overflow-auto p-4 space-y-4">
          {/* Filtres */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Recherche</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
                <input type="date" value={searchDateDebut} onChange={(e) => setSearchDateDebut(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
                <input type="date" value={searchDateFin} onChange={(e) => setSearchDateFin(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Site expéditeur</label>
                <select value={searchSiteId} onChange={(e) => setSearchSiteId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="">Tous les sites</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Destinataire</label>
                <select value={searchDestId} onChange={(e) => setSearchDestId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="">Tous</option>
                  {laboratoires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                <select value={searchStatut} onChange={(e) => setSearchStatut(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="">Tous</option>
                  <option value="en_preparation">En préparation</option>
                  <option value="valide">Validé</option>
                  <option value="envoye">Pris en charge</option>
                  <option value="receptionne">Réceptionné</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Visa opérateur</label>
                <input type="text" value={searchVisa} onChange={(e) => setSearchVisa(e.target.value.toUpperCase())}
                  placeholder="Ex: FD" maxLength={10}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 uppercase focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
            </div>
            <button onClick={handleSearch} disabled={loading}
              className="mt-3 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded hover:bg-teal-700 disabled:opacity-40 transition-colors">
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </div>

          {/* Résultats */}
          {searched && !loading && results.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Aucun résultat</div>
          )}

          {results.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                {results.length} résultat{results.length > 1 ? 's' : ''}
              </div>

              {/* Mobile : cards */}
              <div className="md:hidden flex flex-col divide-y divide-gray-100">
                {results.map((r) => (
                  <div key={r.id} className="p-3 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-500">{fmtDate(r.created_at)} {fmtTime(r.created_at)}</span>
                      {statutBadge(r.statut)}
                    </div>
                    <p className="font-medium text-sm text-gray-800">{r.dest_nom}</p>
                    <p className="text-xs text-gray-500">{r.site_nom}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      {Number(r.nb_ambiant) > 0 && <span className="text-orange-600 font-semibold">Amb: {r.nb_ambiant}</span>}
                      {Number(r.nb_plus4) > 0 && <span className="text-blue-600 font-semibold">+5°C: {r.nb_plus4}</span>}
                      {Number(r.nb_congele) > 0 && <span className="text-purple-600 font-semibold">Cong: {r.nb_congele}</span>}
                      <span className="text-gray-700 font-bold">Total: {r.nb_total}</span>
                      <span className="text-gray-400 font-mono ml-auto">{r.visa_expediteur}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setModalEnvoiId(r.id)}
                        className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50">Voir</button>
                      <button onClick={() => handleExportPdf(r.id)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">PDF</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop : tableau */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">Heure</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Expéditeur</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Destinataire</th>
                      <th className="text-center px-2 py-2 text-xs font-semibold text-orange-600">Amb</th>
                      <th className="text-center px-2 py-2 text-xs font-semibold text-blue-600">+5°C</th>
                      <th className="text-center px-2 py-2 text-xs font-semibold text-purple-600">Cong</th>
                      <th className="text-center px-2 py-2 text-xs font-semibold text-gray-600">Total</th>
                      <th className="text-left px-2 py-2 text-xs font-semibold text-gray-600">Visa</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Statut</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">{fmtTime(r.created_at)}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{r.site_nom}</td>
                        <td className="px-3 py-2 text-sm text-gray-800 font-medium">{r.dest_nom}</td>
                        <td className="px-2 py-2 text-center"><span className={`text-xs font-semibold ${Number(r.nb_ambiant) > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{r.nb_ambiant}</span></td>
                        <td className="px-2 py-2 text-center"><span className={`text-xs font-semibold ${Number(r.nb_plus4) > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{r.nb_plus4}</span></td>
                        <td className="px-2 py-2 text-center"><span className={`text-xs font-semibold ${Number(r.nb_congele) > 0 ? 'text-purple-600' : 'text-gray-300'}`}>{r.nb_congele}</span></td>
                        <td className="px-2 py-2 text-center"><span className="text-xs font-bold text-gray-700">{r.nb_total}</span></td>
                        <td className="px-2 py-2 text-xs font-mono text-gray-600">{r.visa_expediteur}</td>
                        <td className="px-3 py-2">{statutBadge(r.statut)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => setModalEnvoiId(r.id)}
                              className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50 whitespace-nowrap">Voir</button>
                            <button onClick={() => handleExportPdf(r.id)}
                              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">PDF</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
