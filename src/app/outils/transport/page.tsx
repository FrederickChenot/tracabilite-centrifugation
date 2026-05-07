'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import InactivityGuard from '@/components/InactivityGuard';
import { EnvoiTransport, EnvoiSachet, LaboratoireDest, Site, TemperatureTransport } from '@/lib/schemas';
import { exportTransportPdf } from '@/lib/exportTransportPdf';

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
  '+4': '+4°C (2-8°C)',
  congele: 'Congelé (≤ -15°C)',
};

const TEMP_COLORS: Record<TemperatureTransport, string> = {
  ambiant: 'bg-orange-50 border-orange-200',
  '+4': 'bg-blue-50 border-blue-200',
  congele: 'bg-purple-50 border-purple-200',
};

const TEMP_BADGE: Record<TemperatureTransport, string> = {
  ambiant: 'bg-orange-100 text-orange-700',
  '+4': 'bg-blue-100 text-blue-700',
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
  const [selectedDestId, setSelectedDestId] = useState<number | ''>('');
  const [visa, setVisa] = useState('');

  /* Envoi en cours */
  const [envoi, setEnvoi] = useState<EnvoiTransport | null>(null);
  const [creating, setCreating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* Scans */
  const [scanValues, setScanValues] = useState<Record<TemperatureTransport, string>>({
    ambiant: '',
    '+4': '',
    congele: '',
  });
  const [scanning, setScanning] = useState<Record<TemperatureTransport, boolean>>({
    ambiant: false,
    '+4': false,
    congele: false,
  });

  /* Refs pour les inputs de scan */
  const ambiantRef = useRef<HTMLInputElement | null>(null);
  const plus4Ref = useRef<HTMLInputElement | null>(null);
  const congeleRef = useRef<HTMLInputElement | null>(null);
  const scanRefs: Record<TemperatureTransport, React.MutableRefObject<HTMLInputElement | null>> = {
    ambiant: ambiantRef,
    '+4': plus4Ref,
    congele: congeleRef,
  };

  /* Historique du jour */
  const [historique, setHistorique] = useState<EnvoiTransport[]>([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);

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

  /* ── Historique ── */

  const loadHistorique = useCallback(async (sid: number) => {
    setLoadingHistorique(true);
    try {
      const res = await fetch(`/api/transport/envois?site_id=${sid}&date=${todayDate()}`);
      const data = await res.json();
      const list: EnvoiTransport[] = data.envois ?? [];
      setHistorique(list);
      // S'il y a un envoi en_preparation, on le reprend
      const inProgress = list.find((e) => e.statut === 'en_preparation');
      if (inProgress) {
        setEnvoi(inProgress);
        setSelectedDestId(inProgress.dest_id);
        setVisa(inProgress.visa_expediteur);
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
    setScanValues({ ambiant: '', '+4': '', congele: '' });
    loadHistorique(siteId);
  }, [siteId, loadHistorique]);

  /* Pré-remplir visa depuis la session */
  useEffect(() => {
    if (session?.user?.name && !visa) {
      const parts = session.user.name.split(' ');
      const initials = parts.map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 4);
      if (initials) setVisa(initials);
    }
  }, [session, visa]);

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
      // Attacher site_nom, dest_nom, sachets vides
      const destLab = laboratoires.find((l) => l.id === Number(selectedDestId));
      const siteName = sites.find((s) => s.id === siteId)?.nom;
      setEnvoi({
        ...data.envoi,
        site_nom: siteName,
        dest_nom: destLab?.nom,
        sachets: [],
      });
      await loadHistorique(siteId);
      // Focus sur le premier input scan
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
      // Re-focus sur le même input
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
      // Fetch the full envoi for PDF export
      const fullRes = await fetch(`/api/transport/envois/${envoi.id}`);
      const fullData = await fullRes.json();
      const fullEnvoi: EnvoiTransport = fullData.envoi;

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
      setEnvoi(null);
      setScanValues({ ambiant: '', '+4': '', congele: '' });
      await loadHistorique(siteId);
    } finally {
      setValidating(false);
    }
  }

  async function handlePrevisualiser() {
    if (!envoi) return;
    window.open(`/transport/${envoi.id}`, '_blank');
  }

  /* ── Render ── */

  const sachets = envoi?.sachets ?? [];
  const sachetsByTemp = (t: TemperatureTransport) => sachets.filter((s) => s.temperature === t);
  const totalSachets = sachets.length;
  const canValider = totalSachets > 0 && envoi?.statut === 'en_preparation';
  const canCreate = !envoi && selectedDestId !== '' && visa.trim().length >= 1;

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

        <div className="flex-1 min-h-0 overflow-auto md:overflow-hidden">
          <div className="flex flex-col md:flex-row md:h-full gap-0">

            {/* ── Panneau gauche ── */}
            <div className="md:w-[300px] md:shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col overflow-y-auto">

              {/* En-tête panneau */}
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
                    value={selectedDestId}
                    onChange={(e) => setSelectedDestId(e.target.value === '' ? '' : Number(e.target.value))}
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
                    placeholder="Ex: JD"
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

              {/* ── Zones de scan ── */}
              {envoi && (
                <>
                  <div className="px-3 py-2 bg-gray-50 border-t border-b border-gray-200">
                    <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Scan sachets
                    </h2>
                  </div>

                  <div className="flex-1 p-3 space-y-4 overflow-y-auto">
                    {(['ambiant', '+4', 'congele'] as TemperatureTransport[]).map((temp) => {
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
                                className="flex-1 text-sm border border-gray-300 bg-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                              />
                              <button
                                onClick={() => handleScan(temp)}
                                disabled={!scanValues[temp].trim() || scanning[temp]}
                                className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-40 transition-colors"
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
                      <button
                        onClick={handleValider}
                        disabled={!canValider || validating || exporting}
                        className="w-full py-2 rounded text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {validating ? 'Validation...' : exporting ? 'Export PDF...' : `Valider et exporter (${totalSachets} sachet${totalSachets > 1 ? 's' : ''})`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Panneau droit : historique ── */}
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
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap">Heure</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Destinataire</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-orange-600">Amb</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-blue-600">+4°C</th>
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
                            onClick={() => window.open(`/transport/${e.id}`, '_blank')}
                            className={`border-b border-gray-100 cursor-pointer transition-colors ${
                              isActive ? 'bg-teal-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap font-mono">
                              {fmtTime(e.created_at)}
                            </td>
                            <td className="px-4 py-2.5 text-gray-800 font-medium">
                              {e.dest_nom}
                              {isActive && (
                                <span className="ml-1 text-xs text-teal-600 font-normal">(en cours)</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-xs font-semibold ${nb('ambiant') > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                                {nb('ambiant')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-xs font-semibold ${nb('+4') > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                                {nb('+4')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-xs font-semibold ${nb('congele') > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                                {nb('congele')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="text-xs font-bold text-gray-700">{s.length}</span>
                            </td>
                            <td className="px-3 py-2.5 text-xs font-mono text-gray-600">
                              {e.visa_expediteur}
                            </td>
                            <td className="px-4 py-2.5">
                              {statutBadge(e.statut)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
