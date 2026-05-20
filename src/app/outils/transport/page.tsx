'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import InactivityGuard from '@/components/InactivityGuard';
import { EnvoiTransport, EnvoiSachet, LaboratoireDest, Site, TemperatureTransport } from '@/lib/schemas';
import { exportTransportPdf } from '@/lib/exportTransportPdf';

/* ─── Types ─────────────────────────────────────────────────── */

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

/* ─── Helpers ────────────────────────────────────────────────── */

function todayDate(): string {
  return new Date().toLocaleDateString('fr-CA');
}

function bonNum(id: string) { return id.slice(0, 6).toUpperCase(); }

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

const TEMP_LABELS: Record<TemperatureTransport, string> = {
  ambiant: 'Ambiant (15-25°C)',
  plus4: '+5°C (2-8°C)',
  congele: 'Congelé (≤ -15°C)',
};

const TEMP_COLORS: Record<TemperatureTransport, string> = {
  ambiant: 'bg-orange-50 border-orange-200',
  plus4: 'bg-blue-50 border-blue-200',
  congele: 'bg-purple-50 border-purple-200',
};

const TEMP_BADGE: Record<TemperatureTransport, string> = {
  ambiant: 'bg-orange-100 text-orange-700',
  plus4: 'bg-blue-100 text-blue-700',
  congele: 'bg-purple-100 text-purple-700',
};

/* ─── Page principale ────────────────────────────────────────── */

export default function TransportPage() {
  const { data: session } = useSession();

  /* Sidebar */
  const [siteId, setSiteId] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Référentiels */
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratoires, setLaboratoires] = useState<LaboratoireDest[]>([]);

  /* Formulaire nouvel envoi */
  const [selectedDestId, setSelectedDestId] = useState<number | null>(null);
  const [visa, setVisa] = useState('');

  /* Envoi en cours */
  const [envoi, setEnvoi] = useState<EnvoiTransport | null>(null);
  const [creating, setCreating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* Scans */
  const [scanValues, setScanValues] = useState<Record<TemperatureTransport, string>>({
    ambiant: '',
    plus4: '',
    congele: '',
  });
  const [scanning, setScanning] = useState<Record<TemperatureTransport, boolean>>({
    ambiant: false,
    plus4: false,
    congele: false,
  });

  /* Refs pour les inputs de scan */
  const ambiantRef = useRef<HTMLInputElement | null>(null);
  const plus4Ref = useRef<HTMLInputElement | null>(null);
  const congeleRef = useRef<HTMLInputElement | null>(null);
  const scanRefs: Record<TemperatureTransport, React.MutableRefObject<HTMLInputElement | null>> = {
    ambiant: ambiantRef,
    plus4: plus4Ref,
    congele: congeleRef,
  };

  /* Historique du jour */
  const [historique, setHistorique] = useState<EnvoiTransport[]>([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);

  /* Modal bon de transport */
  const [modalEnvoiId, setModalEnvoiId] = useState<string | null>(null);

  /* Onglets */
  const [activeTab, setActiveTab] = useState<'envoi' | 'historique'>('envoi');

  /* Historique recherche */
  const [searchDateDebut, setSearchDateDebut] = useState('');
  const [searchDateFin, setSearchDateFin] = useState('');
  const [searchSiteId, setSearchSiteId] = useState('');
  const [searchDestId, setSearchDestId] = useState('');
  const [searchStatut, setSearchStatut] = useState('');
  const [searchVisa, setSearchVisa] = useState('');
  const [historiqueAll, setHistoriqueAll] = useState<HistoriqueRow[]>([]);
  const [loadingHistoriqueAll, setLoadingHistoriqueAll] = useState(false);

  /* Toast simple */
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  /* ── Chargement référentiels ── */

  const loadSites = useCallback(async () => {
    const res = await fetch('/api/admin/sites');
    const data = await res.json();
    setSites(data.sites ?? []);
  }, []);

  const loadLaboratoires = useCallback(async () => {
    const res = await fetch('/api/transport/laboratoires');
    const data = await res.json();
    setLaboratoires(data.laboratoires ?? []);
  }, []);

  /* ── Historique du jour ── */

  const loadHistorique = useCallback(async (sid: number, restoreInProgress = false) => {
    setLoadingHistorique(true);
    try {
      const res = await fetch(`/api/transport/envois?site_id=${sid}&date=${todayDate()}`);
      const data = await res.json();
      const list: EnvoiTransport[] = data.envois ?? [];
      setHistorique(list);
      if (restoreInProgress) {
        const inProgress = list.find((e) => e.statut === 'en_preparation');
        if (inProgress) {
          setEnvoi(inProgress);
          setSelectedDestId(inProgress.dest_id);
          setVisa(inProgress.visa_expediteur);
        }
      }
    } finally {
      setLoadingHistorique(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
    loadLaboratoires();
  }, [loadSites, loadLaboratoires]);

  useEffect(() => {
    setEnvoi(null);
    setScanValues({ ambiant: '', plus4: '', congele: '' });
    loadHistorique(siteId, true);
  }, [siteId, loadHistorique]);

  /* ── Actions ── */

  async function handleNouvelEnvoi() {
    if (!selectedDestId || !visa.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/transport/envois', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, dest_id: Number(selectedDestId), visa_expediteur: visa.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error ?? 'Erreur', 'error');
        return;
      }
      const data = await res.json();
      const destLab = laboratoires.find((l) => l.id === Number(selectedDestId));
      const siteName = sites.find((s) => s.id === siteId)?.nom;
      setEnvoi({
        ...data.envoi,
        site_nom: siteName,
        dest_nom: destLab?.nom,
        sachets: [],
      });
      await loadHistorique(siteId);
      setTimeout(() => ambiantRef.current?.focus(), 100);
    } finally {
      setCreating(false);
    }
  }

  async function handleScan(temperature: TemperatureTransport) {
    const code = scanValues[temperature].trim();
    if (!code || !envoi) return;
    setScanning((prev) => ({ ...prev, [temperature]: true }));
    try {
      const res = await fetch('/api/transport/sachets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envoi_id: envoi.id, temperature, code_barre: code }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error ?? 'Erreur scan', 'error');
        return;
      }
      const data = await res.json();
      setScanValues((prev) => ({ ...prev, [temperature]: '' }));
      setEnvoi((prev) =>
        prev ? { ...prev, sachets: [...(prev.sachets ?? []), data.sachet as EnvoiSachet] } : prev
      );
      await loadHistorique(siteId);
      setTimeout(() => scanRefs[temperature].current?.focus(), 50);
    } finally {
      setScanning((prev) => ({ ...prev, [temperature]: false }));
    }
  }

  async function handleDeleteSachet(sachetId: string, temperature: TemperatureTransport) {
    if (!confirm('Supprimer ce sachet ?')) return;
    const res = await fetch(`/api/transport/sachets/${sachetId}`, { method: 'DELETE' });
    if (res.ok) {
      setEnvoi((prev) =>
        prev ? { ...prev, sachets: (prev.sachets ?? []).filter((s) => s.id !== sachetId) } : prev
      );
      await loadHistorique(siteId);
      setTimeout(() => scanRefs[temperature].current?.focus(), 50);
    } else {
      showToast('Erreur suppression', 'error');
    }
  }

  async function handleValider() {
    if (!envoi) return;
    const totalSachets = (envoi.sachets ?? []).length;
    if (totalSachets === 0) {
      showToast('Aucun sachet scanné', 'error');
      return;
    }
    setValidating(true);
    try {
      const res = await fetch(`/api/transport/envois/${envoi.id}/valider`, { method: 'PATCH' });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error ?? 'Erreur validation', 'error');
        return;
      }
      const fullRes = await fetch(`/api/transport/envois/${envoi.id}`);
      const fullData = await fullRes.json();
      const fullEnvoi: EnvoiTransport = fullData.envoi ?? fullData;

      setExporting(true);
      try {
        await exportTransportPdf(fullEnvoi);
      } catch (pdfErr) {
        console.error('PDF error', pdfErr);
        showToast('Erreur export PDF', 'error');
      } finally {
        setExporting(false);
      }

      showToast('Envoi validé — bon exporté');
      setScanValues({ ambiant: '', plus4: '', congele: '' });
      setEnvoi((prev) => prev ? { ...prev, statut: 'valide' } : null);
      await loadHistorique(siteId);
    } finally {
      setValidating(false);
    }
  }

  function handlePrevisualiser() {
    if (!envoi) return;
    setModalEnvoiId(envoi.id);
  }

  async function handleRegeneratePdf() {
    if (!envoi) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/transport/envois/${envoi.id}`);
      const data = await res.json();
      if (data.envoi) await exportTransportPdf(data.envoi);
    } catch {
      showToast('Erreur export PDF', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleSearchHistorique() {
    setLoadingHistoriqueAll(true);
    try {
      const params = new URLSearchParams();
      if (searchSiteId) params.set('site_id', searchSiteId);
      if (searchDestId) params.set('dest_id', searchDestId);
      if (searchStatut) params.set('statut', searchStatut);
      if (searchDateDebut) params.set('date_debut', searchDateDebut);
      if (searchDateFin) params.set('date_fin', searchDateFin);
      if (searchVisa) params.set('visa', searchVisa);
      const res = await fetch(`/api/transport/historique?${params}`);
      const data = await res.json();
      setHistoriqueAll(data.envois ?? []);
    } finally {
      setLoadingHistoriqueAll(false);
    }
  }

  async function handleHistoriquePdf(envoiId: string) {
    try {
      const res = await fetch(`/api/transport/envois/${envoiId}`);
      const data = await res.json();
      if (data.envoi) await exportTransportPdf(data.envoi);
    } catch {
      showToast('Erreur export PDF', 'error');
    }
  }

  /* ── Render ── */

  const sachets = envoi?.sachets ?? [];
  const sachetsByTemp = (t: TemperatureTransport) => sachets.filter((s) => s.temperature === t);
  const totalSachets = sachets.length;
  const canValider = totalSachets > 0 && envoi?.statut === 'en_preparation';
  const canCreate = !envoi && selectedDestId !== null && visa.trim().length >= 1;

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
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}

      {/* Modal bon de transport */}
      {modalEnvoiId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalEnvoiId(null); }}
        >
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Bon de transport</h2>
              <button
                onClick={() => setModalEnvoiId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                aria-label="Fermer"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <iframe
              src={`/transport/${modalEnvoiId}`}
              className="w-full border-0 flex-1"
              style={{ minHeight: '60vh' }}
              title="Bon de transport"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar mobile */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded text-gray-500 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-gray-800 text-sm">Transport prélèvements</span>
        </div>

        {/* Onglets */}
        <div className="flex bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setActiveTab('envoi')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'envoi'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Nouvel envoi
          </button>
          <button
            onClick={() => {
              setActiveTab('historique');
              if (historiqueAll.length === 0) handleSearchHistorique();
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'historique'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Historique
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto overflow-x-hidden md:overflow-hidden">
          {activeTab === 'envoi' ? (
            <div className="flex flex-col md:flex-row md:h-full gap-0">

              {/* ── Panneau gauche ── */}
              <div className="md:w-[300px] md:shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col overflow-y-auto overflow-x-hidden">

                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Nouvel envoi
                  </h2>
                </div>

                <div className="p-3 space-y-3">
                  {/* Sélecteur destinataire */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Destinataire</label>
                    <select
                      value={selectedDestId ?? ''}
                      onChange={(e) => setSelectedDestId(e.target.value === '' ? null : Number(e.target.value))}
                      disabled={!!envoi}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">-- Choisir un labo --</option>
                      {laboratoires.map((l) => (
                        <option key={l.id} value={l.id}>{l.nom}</option>
                      ))}
                    </select>
                  </div>

                  {/* Visa */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Initiales opérateur</label>
                    <input
                      type="text"
                      value={visa}
                      onChange={(e) => setVisa(e.target.value.toUpperCase().slice(0, 4))}
                      disabled={!!envoi}
                      placeholder="Ex: FD"
                      maxLength={4}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400 uppercase"
                    />
                  </div>

                  {/* Bouton créer */}
                  {!envoi && (
                    <button
                      onClick={handleNouvelEnvoi}
                      disabled={!canCreate || creating}
                      className="w-full py-2 rounded text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {creating ? 'Création...' : '+ Créer un bon de transport'}
                    </button>
                  )}

                  {/* Infos envoi en cours */}
                  {envoi && (
                    <div className="bg-teal-50 border border-teal-200 rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-800">
                          Bon N°{bonNum(envoi.id)}
                        </span>
                        {statutBadge(envoi.statut)}
                      </div>
                      <div className="text-xs text-teal-700">
                        <span className="font-medium">Dest :</span> {envoi.dest_nom}
                      </div>
                      <div className="text-xs text-teal-700">
                        <span className="font-medium">Opérateur :</span> {envoi.visa_expediteur}
                      </div>
                      <div className="text-xs text-teal-700">
                        <span className="font-medium">Total sachets :</span> {totalSachets}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Bannière retardataires (statut 'valide') ── */}
                {envoi?.statut === 'valide' && (
                  <div className="px-3 py-3 bg-green-50 border-t border-green-200 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-green-700">✓ Bon validé et exporté</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRegeneratePdf}
                        disabled={exporting}
                        className="flex-1 py-1.5 rounded text-xs font-semibold border border-green-400 text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors"
                      >
                        {exporting ? 'Export...' : 'Regénérer le PDF'}
                      </button>
                      <button
                        onClick={() => { setEnvoi(null); setScanValues({ ambiant: '', plus4: '', congele: '' }); }}
                        className="flex-1 py-1.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        Nouveau bon →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Zones de scan ── */}
                {envoi && (
                  <>
                    <div className="px-3 py-2 bg-gray-50 border-t border-b border-gray-200">
                      <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {envoi.statut === 'valide' ? 'Sachets retardataires' : 'Scan sachets'}
                      </h2>
                    </div>

                    <div className="flex-1 p-3 space-y-4 overflow-y-auto">
                      {(['ambiant', 'plus4', 'congele'] as TemperatureTransport[]).map((temp) => {
                        const tempSachets = sachetsByTemp(temp);
                        return (
                          <div
                            key={temp}
                            className={`border rounded-lg overflow-hidden ${TEMP_COLORS[temp]}`}
                          >
                            <div className="px-3 py-2 flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-700">
                                {TEMP_LABELS[temp]}
                              </span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TEMP_BADGE[temp]}`}>
                                {tempSachets.length}
                              </span>
                            </div>

                            {/* Input scan */}
                            <div className="px-3 pb-2">
                              <div className="flex gap-1">
                                <input
                                  ref={scanRefs[temp]}
                                  type="text"
                                  value={scanValues[temp]}
                                  onChange={(e) => setScanValues((prev) => ({ ...prev, [temp]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleScan(temp);
                                    }
                                  }}
                                  placeholder="Scanner ou saisir..."
                                  disabled={scanning[temp]}
                                  className="flex-1 min-w-0 text-base border border-gray-300 bg-white rounded px-2 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                                />
                                <button
                                  onClick={() => handleScan(temp)}
                                  disabled={!scanValues[temp].trim() || scanning[temp]}
                                  className="px-3 py-2.5 text-sm font-semibold bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-40 transition-colors min-w-[44px]"
                                >
                                  {scanning[temp] ? '...' : 'OK'}
                                </button>
                              </div>
                            </div>

                            {/* Liste sachets scannés */}
                            {tempSachets.length > 0 && (
                              <ul className="divide-y divide-gray-200 border-t border-gray-200">
                                {tempSachets.map((s) => (
                                  <li
                                    key={s.id}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white"
                                  >
                                    <span className="flex-1 text-xs font-mono text-gray-700">{s.code_barre}</span>
                                    <span className="text-xs text-gray-400">{fmtTime(s.created_at ?? s.scanned_at)}</span>
                                    <button
                                      onClick={() => handleDeleteSachet(s.id, temp)}
                                      className="text-red-400 hover:text-red-600 text-xs ml-1"
                                      title="Supprimer"
                                    >
                                      ✕
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}

                      {/* Boutons action */}
                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          onClick={handlePrevisualiser}
                          className="w-full py-2 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Prévisualiser le bon
                        </button>
                        {envoi?.statut !== 'valide' && (
                          <button
                            onClick={handleValider}
                            disabled={!canValider || validating || exporting}
                            className="w-full py-2 rounded text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {validating ? 'Validation...' : exporting ? 'Export PDF...' : `Valider et exporter (${totalSachets} sachet${totalSachets > 1 ? 's' : ''})`}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── Panneau droit : historique du jour ── */}
              <div className="flex-1 flex flex-col md:min-h-0">
                <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-3">
                  <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Envois du jour
                  </h2>
                  <span className="text-xs text-gray-400">
                    {new Date().toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="ml-auto text-xs text-gray-500">
                    {historique.length} envoi{historique.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex-1 md:min-h-0 md:overflow-auto">
                  {loadingHistorique ? (
                    <div className="flex items-center justify-center p-8 text-sm text-gray-400">
                      Chargement...
                    </div>
                  ) : historique.length === 0 ? (
                    <div className="flex items-center justify-center p-8 text-sm text-gray-400">
                      Aucun envoi aujourd&apos;hui
                    </div>
                  ) : (
                    <>
                      {/* Mobile : cards */}
                      <div className="md:hidden flex flex-col divide-y divide-gray-100">
                        {historique.map((e) => {
                          const s = e.sachets ?? [];
                          const nb = (t: TemperatureTransport) => s.filter((x) => x.temperature === t).length;
                          const isActive = envoi?.id === e.id;
                          return (
                            <div
                              key={e.id}
                              onClick={() => setModalEnvoiId(e.id)}
                              className={`p-3 cursor-pointer active:bg-gray-100 ${isActive ? 'bg-teal-50' : 'bg-white'}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-mono text-gray-500">{fmtTime(e.created_at)}</span>
                                {statutBadge(e.statut)}
                              </div>
                              <p className="font-medium text-sm text-gray-800">
                                {e.dest_nom}
                                {isActive && <span className="ml-1 text-xs text-teal-600 font-normal">(en cours)</span>}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5 text-xs">
                                {nb('ambiant') > 0 && <span className="text-orange-600 font-semibold">Amb: {nb('ambiant')}</span>}
                                {nb('plus4') > 0 && <span className="text-blue-600 font-semibold">+5°C: {nb('plus4')}</span>}
                                {nb('congele') > 0 && <span className="text-purple-600 font-semibold">Cong: {nb('congele')}</span>}
                                <span className="text-gray-700 font-bold">Total: {s.length}</span>
                                <span className="text-gray-400 font-mono ml-auto">{e.visa_expediteur}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Desktop : tableau */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-50 z-10">
                            <tr className="border-b border-gray-200">
                              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">Heure</th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Destinataire</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-orange-600">Amb</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600">+5°C</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-purple-600">Cong</th>
                              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600">Total</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Visa</th>
                              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historique.map((e) => {
                              const s = e.sachets ?? [];
                              const nb = (t: TemperatureTransport) => s.filter((x) => x.temperature === t).length;
                              const isActive = envoi?.id === e.id;
                              return (
                                <tr
                                  key={e.id}
                                  onClick={() => setModalEnvoiId(e.id)}
                                  className={`border-b border-gray-100 cursor-pointer transition-colors ${
                                    isActive ? 'bg-teal-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap font-mono">{fmtTime(e.created_at)}</td>
                                  <td className="px-4 py-2.5 text-gray-800 font-medium">
                                    {e.dest_nom}
                                    {isActive && <span className="ml-1 text-xs text-teal-600 font-normal">(en cours)</span>}
                                  </td>
                                  <td className="px-3 py-2.5 text-center"><span className={`text-xs font-semibold ${nb('ambiant') > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{nb('ambiant')}</span></td>
                                  <td className="px-3 py-2.5 text-center"><span className={`text-xs font-semibold ${nb('plus4') > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{nb('plus4')}</span></td>
                                  <td className="px-3 py-2.5 text-center"><span className={`text-xs font-semibold ${nb('congele') > 0 ? 'text-purple-600' : 'text-gray-300'}`}>{nb('congele')}</span></td>
                                  <td className="px-3 py-2.5 text-center"><span className="text-xs font-bold text-gray-700">{s.length}</span></td>
                                  <td className="px-3 py-2.5 text-xs font-mono text-gray-600">{e.visa_expediteur}</td>
                                  <td className="px-4 py-2.5">{statutBadge(e.statut)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Onglet Historique ── */
            <div className="p-4 flex flex-col gap-4 md:max-w-6xl md:mx-auto">
              {/* Formulaire de recherche */}
              <div className="bg-white rounded border border-gray-200 p-4">
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Recherche
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
                    <input
                      type="date"
                      value={searchDateDebut}
                      onChange={(e) => setSearchDateDebut(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
                    <input
                      type="date"
                      value={searchDateFin}
                      onChange={(e) => setSearchDateFin(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Site expéditeur</label>
                    <select
                      value={searchSiteId}
                      onChange={(e) => setSearchSiteId(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Tous les sites</option>
                      {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Destinataire</label>
                    <select
                      value={searchDestId}
                      onChange={(e) => setSearchDestId(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Tous les destinataires</option>
                      {laboratoires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                    <select
                      value={searchStatut}
                      onChange={(e) => setSearchStatut(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="en_preparation">En préparation</option>
                      <option value="valide">Validé</option>
                      <option value="envoye">Pris en charge</option>
                      <option value="receptionne">Réceptionné</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Visa opérateur</label>
                    <input
                      type="text"
                      value={searchVisa}
                      onChange={(e) => setSearchVisa(e.target.value.toUpperCase())}
                      placeholder="Ex: FD"
                      maxLength={10}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSearchHistorique}
                  disabled={loadingHistoriqueAll}
                  className="mt-3 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded hover:bg-teal-700 disabled:opacity-40 transition-colors"
                >
                  {loadingHistoriqueAll ? 'Recherche...' : 'Rechercher'}
                </button>
              </div>

              {/* Résultats */}
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                {loadingHistoriqueAll ? (
                  <div className="p-8 text-center text-sm text-gray-400">Chargement...</div>
                ) : historiqueAll.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">
                    Aucun résultat — lancez une recherche ci-dessus
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                      {historiqueAll.length} résultat{historiqueAll.length > 1 ? 's' : ''}
                    </div>
                    {/* Mobile : cards */}
                    <div className="md:hidden flex flex-col divide-y divide-gray-100">
                      {historiqueAll.map((e) => (
                        <div key={e.id} className="p-3 bg-white">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono text-gray-500">{fmtDate(e.created_at)} {fmtTime(e.created_at)}</span>
                            {statutBadge(e.statut)}
                          </div>
                          <p className="font-medium text-sm text-gray-800">{e.dest_nom}</p>
                          <p className="text-xs text-gray-500">{e.site_nom}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            {Number(e.nb_ambiant) > 0 && <span className="text-orange-600 font-semibold">Amb: {e.nb_ambiant}</span>}
                            {Number(e.nb_plus4) > 0 && <span className="text-blue-600 font-semibold">+5°C: {e.nb_plus4}</span>}
                            {Number(e.nb_congele) > 0 && <span className="text-purple-600 font-semibold">Cong: {e.nb_congele}</span>}
                            <span className="text-gray-700 font-bold">Total: {e.nb_total}</span>
                            <span className="text-gray-400 font-mono ml-auto">{e.visa_expediteur}</span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => setModalEnvoiId(e.id)}
                              className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50"
                            >
                              Voir le bon
                            </button>
                            <button
                              onClick={() => handleHistoriquePdf(e.id)}
                              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                              PDF
                            </button>
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
                          {historiqueAll.map((e) => (
                            <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDate(e.created_at)}</td>
                              <td className="px-3 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">{fmtTime(e.created_at)}</td>
                              <td className="px-3 py-2 text-xs text-gray-700">{e.site_nom}</td>
                              <td className="px-3 py-2 text-sm text-gray-800 font-medium">{e.dest_nom}</td>
                              <td className="px-2 py-2 text-center"><span className={`text-xs font-semibold ${Number(e.nb_ambiant) > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{e.nb_ambiant}</span></td>
                              <td className="px-2 py-2 text-center"><span className={`text-xs font-semibold ${Number(e.nb_plus4) > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{e.nb_plus4}</span></td>
                              <td className="px-2 py-2 text-center"><span className={`text-xs font-semibold ${Number(e.nb_congele) > 0 ? 'text-purple-600' : 'text-gray-300'}`}>{e.nb_congele}</span></td>
                              <td className="px-2 py-2 text-center"><span className="text-xs font-bold text-gray-700">{e.nb_total}</span></td>
                              <td className="px-2 py-2 text-xs font-mono text-gray-600">{e.visa_expediteur}</td>
                              <td className="px-3 py-2">{statutBadge(e.statut)}</td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setModalEnvoiId(e.id)}
                                    className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50 whitespace-nowrap"
                                  >
                                    Voir
                                  </button>
                                  <button
                                    onClick={() => handleHistoriquePdf(e.id)}
                                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                                  >
                                    PDF
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Padding bottom mobile pour le bouton sticky */}
        {envoi && activeTab === 'envoi' && <div className="md:hidden h-16" />}
      </div>

      {/* Bouton sticky mobile */}
      {envoi && activeTab === 'envoi' && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-gray-200"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {envoi.statut === 'valide' ? (
            <div className="flex">
              <button
                onClick={handleRegeneratePdf}
                disabled={exporting}
                className="flex-1 bg-green-600 text-white font-semibold text-sm disabled:opacity-40"
                style={{ height: '56px' }}
              >
                {exporting ? 'Export...' : 'Regénérer PDF'}
              </button>
              <button
                onClick={() => { setEnvoi(null); setScanValues({ ambiant: '', plus4: '', congele: '' }); }}
                className="flex-1 bg-gray-100 text-gray-700 font-semibold text-sm"
                style={{ height: '56px' }}
              >
                Nouveau bon →
              </button>
            </div>
          ) : (
            <button
              onClick={handleValider}
              disabled={!canValider || validating || exporting}
              className="w-full bg-teal-600 text-white font-semibold text-base disabled:opacity-40"
              style={{ height: '56px' }}
            >
              {validating ? 'Validation...' : exporting ? 'Export PDF...' : `Valider (${totalSachets} sachet${totalSachets > 1 ? 's' : ''})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
