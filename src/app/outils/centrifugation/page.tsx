'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import SessionConfig from '@/components/centrifugation/SessionConfig';
import ScanZone from '@/components/centrifugation/ScanZone';
import HistoriqueTable from '@/components/centrifugation/HistoriqueTable';
import {
  CentrifugeusesAvecProgrammes,
  Tube,
  HistoriqueSession,
} from '@/lib/schemas';

function todayDate(): string {
  return new Date().toLocaleDateString('fr-CA'); // YYYY-MM-DD
}

export default function CentrifugationPage() {
  const [siteId, setSiteId] = useState(1);
  const [centrifugeuses, setCentrifugeuses] = useState<CentrifugeusesAvecProgrammes[]>([]);

  const [selectedCentri, setSelectedCentri] = useState<number | null>(null);
  const [selectedProg, setSelectedProg] = useState<number | null>(null);
  const [stockage, setStockage] = useState<'ambiant' | '+5' | '-20' | null>(null);
  const [visa, setVisa] = useState('');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [tubes, setTubes] = useState<Tube[]>([]);

  const [historique, setHistorique] = useState<HistoriqueSession[]>([]);
  const [loadingReferentiels, setLoadingReferentiels] = useState(true);

  const loadReferentiels = useCallback(async (sid: number) => {
    setLoadingReferentiels(true);
    try {
      const res = await fetch(`/api/referentiels?site_id=${sid}`);
      const data = await res.json();
      setCentrifugeuses(data.centrifugeuses ?? []);
    } finally {
      setLoadingReferentiels(false);
    }
  }, []);

  const loadHistorique = useCallback(async () => {
    const res = await fetch(`/api/centri/historique?site_id=${siteId}&date=${todayDate()}`);
    const data = await res.json();
    setHistorique(data.sessions ?? []);
  }, [siteId]);

  useEffect(() => {
    loadReferentiels(siteId);
    loadHistorique();
    setSelectedCentri(null);
    setSelectedProg(null);
    setStockage(null);
    setVisa('');
    setSessionId(null);
    setSessionActive(false);
    setTubes([]);
  }, [siteId, loadReferentiels, loadHistorique]);

  const canStart =
    selectedCentri !== null &&
    selectedProg !== null &&
    stockage !== null &&
    visa.trim().length >= 1;

  async function handleStartSession() {
    if (!canStart) return;
    const res = await fetch('/api/centri/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: siteId,
        centri_id: selectedCentri,
        prog_id: selectedProg,
        stockage,
        visa: visa.trim(),
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setSessionId(data.session_id);
    setSessionActive(true);
    setTubes([]);
    await loadHistorique();
  }

  async function handleScan(numEchant: string) {
    if (!sessionId) return;
    const res = await fetch('/api/centri/tubes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, num_echant: numEchant }),
    });
    if (!res.ok) return;
    const tube: Tube = await res.json();
    setTubes((prev) => [...prev, tube]);
    await loadHistorique();
  }

  async function handleDeleteTube(id: string) {
    await fetch(`/api/centri/tubes/${id}`, { method: 'DELETE' });
    setTubes((prev) => prev.filter((t) => t.id !== id));
    await loadHistorique();
  }

  async function handleCloturer() {
    if (!sessionId) return;
    await fetch(`/api/centri/sessions/${sessionId}/cloturer`, { method: 'PATCH' });
    setSessionActive(false);
    setSessionId(null);
    setTubes([]);
    setSelectedCentri(null);
    setSelectedProg(null);
    setStockage(null);
    setVisa('');
    await loadHistorique();
  }

  function handleExportPdf() {
    window.print();
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar siteId={siteId} onSiteChange={setSiteId} />

      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          sessionActive={sessionActive}
          tubeCount={tubes.length}
          onCloturer={handleCloturer}
          onExportPdf={handleExportPdf}
        />

        <div className="flex flex-1 min-h-0 gap-0">
          {/* Panneau gauche : config + scan */}
          <div className="w-[270px] shrink-0 bg-white border-r border-gray-200 flex flex-col min-h-0">
            <div className="border-b border-gray-200">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Configuration session
                </h2>
              </div>
              {loadingReferentiels ? (
                <div className="p-4 text-xs text-gray-400">Chargement...</div>
              ) : (
                <SessionConfig
                  centrifugeuses={centrifugeuses}
                  selectedCentri={selectedCentri}
                  selectedProg={selectedProg}
                  stockage={stockage}
                  visa={visa}
                  sessionActive={sessionActive}
                  onCentriChange={(id) => {
                    setSelectedCentri(id);
                    setSelectedProg(null);
                  }}
                  onProgChange={setSelectedProg}
                  onStockageChange={setStockage}
                  onVisaChange={setVisa}
                />
              )}
            </div>

            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Scan tubes
              </h2>
            </div>

            <ScanZone
              sessionId={sessionId}
              tubes={tubes}
              sessionActive={sessionActive}
              canStart={canStart}
              onScan={handleScan}
              onDelete={handleDeleteTube}
              onStartSession={handleStartSession}
            />
          </div>

          {/* Panneau droit : historique */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-3">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Historique du jour
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
                {historique.length} session{historique.length !== 1 ? 's' : ''}
                {' · '}
                {historique.reduce((acc, s) => acc + s.tubes.length, 0)} tubes
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <HistoriqueTable sessions={historique} currentSessionId={sessionId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
