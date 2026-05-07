'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { EnvoiTransport, TemperatureTransport } from '@/lib/schemas';

/* ─── Helpers ────────────────────────────────────────────────── */

function bonNum(id: string) { return id.slice(0, 6).toUpperCase(); }

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statutBadge(statut: string) {
  const map: Record<string, { label: string; cls: string }> = {
    en_preparation: { label: 'En préparation', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
    valide:         { label: 'Validé — en attente du transporteur', cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
    envoye:         { label: 'En transit', cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
    receptionne:    { label: 'Réceptionné', cls: 'bg-green-100 text-green-700 border border-green-200' },
  };
  const s = map[statut] ?? { label: statut, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

const TEMP_CONFIG: Record<TemperatureTransport, { label: string; icon: string; bg: string; badge: string; border: string }> = {
  ambiant: {
    label: 'Ambiant (15-25°C)',
    icon: '☀',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    border: 'border-orange-200',
  },
  '+4': {
    label: '+4°C (2-8°C)',
    icon: '❄',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
  },
  congele: {
    label: 'Congelé (≤ -15°C)',
    icon: '🧊',
    bg: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200',
  },
};

/* ─── Formulaire transporteur ────────────────────────────────── */

function FormulaireTransporteur({ envoiId, onSuccess }: { envoiId: string; onSuccess: () => void }) {
  const [nom, setNom] = useState('');
  const [visa, setVisa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !visa.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/transport/envois/${envoiId}/envoyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom_transporteur: nom.trim(), visa_transporteur: visa.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Erreur');
        return;
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-5">
      <h3 className="text-base font-bold text-gray-900 mb-1">Prise en charge — Transporteur</h3>
      <p className="text-sm text-gray-500 mb-4">
        Confirmez la prise en charge de ces prélèvements.
      </p>
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nom du transporteur</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom Prénom"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Initiales / Visa</label>
          <input
            type="text"
            value={visa}
            onChange={(e) => setVisa(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="Ex: JD"
            maxLength={4}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !nom.trim() || !visa.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Confirmation...' : 'Confirmer la prise en charge'}
        </button>
      </form>
    </div>
  );
}

/* ─── Formulaire réceptionneur ───────────────────────────────── */

function FormulaireReceptionnaire({ envoiId, onSuccess }: { envoiId: string; onSuccess: () => void }) {
  const [nom, setNom] = useState('');
  const [visa, setVisa] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !visa.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/transport/envois/${envoiId}/receptionner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom_receptionnaire: nom.trim(), visa_receptionnaire: visa.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Erreur');
        return;
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
      <h3 className="text-base font-bold text-gray-900 mb-1">Réception — Laboratoire destinataire</h3>
      <p className="text-sm text-gray-500 mb-4">
        Confirmez la réception de ces prélèvements.
      </p>
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nom du réceptionnaire</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom Prénom"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Initiales / Visa</label>
          <input
            type="text"
            value={visa}
            onChange={(e) => setVisa(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="Ex: JD"
            maxLength={4}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !nom.trim() || !visa.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Confirmation...' : 'Confirmer la réception'}
        </button>
      </form>
    </div>
  );
}

/* ─── Page principale ────────────────────────────────────────── */

export default function TransportBonPage() {
  const params = useParams();
  const id = params.id as string;

  const [envoi, setEnvoi] = useState<EnvoiTransport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadEnvoi() {
    try {
      const res = await fetch(`/api/transport/envois/${id}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Introuvable');
        return;
      }
      const data = await res.json();
      setEnvoi(data.envoi as EnvoiTransport);
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEnvoi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Chargement...</div>
      </div>
    );
  }

  if (error || !envoi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-lg mb-2">Bon introuvable</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const sachets = envoi.sachets ?? [];
  const num = bonNum(envoi.id);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <div className="bg-teal-700 text-white print:bg-teal-700 print:text-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-teal-200 uppercase tracking-wider">GCS Bio Med</p>
            <h1 className="text-lg font-bold">Bon de transport N°{num}</h1>
          </div>
          <div className="text-right">
            <div className="print:hidden">
              {statutBadge(envoi.statut)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Informations générales */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Informations
            </h2>
          </div>
          <div className="px-4 py-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Expéditeur</p>
              <p className="text-sm font-semibold text-gray-900">CH {envoi.site_nom ?? '—'}</p>
              <p className="text-xs text-gray-500">Laboratoire de Biologie Médicale</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Destinataire</p>
              <p className="text-sm font-semibold text-gray-900">{envoi.dest_nom ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Date de création</p>
              <p className="text-sm font-medium text-gray-800">{fmtDateTime(envoi.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Opérateur expéditeur</p>
              <p className="text-sm font-mono font-bold text-gray-900">{envoi.visa_expediteur}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Statut</p>
              {statutBadge(envoi.statut)}
            </div>
          </div>
        </div>

        {/* Table sachets */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Prélèvements
            </h2>
            <span className="text-sm font-bold text-teal-700">
              {sachets.length} sachet{sachets.length !== 1 ? 's' : ''}
            </span>
          </div>

          {(['ambiant', '+4', 'congele'] as TemperatureTransport[]).map((temp) => {
            const tc = TEMP_CONFIG[temp];
            const ts = sachets.filter((s) => s.temperature === temp);
            if (ts.length === 0) return null;
            return (
              <div key={temp} className={`border-b last:border-b-0 border-gray-100 ${tc.bg}`}>
                <div className={`px-4 py-2 border-b ${tc.border} flex items-center justify-between`}>
                  <span className="text-xs font-semibold text-gray-700">
                    {tc.icon} {tc.label}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${tc.badge}`}>
                    {ts.length}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {ts.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-2 bg-white">
                      <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                      <span className="flex-1 text-sm font-mono text-gray-800">{s.code_barre}</span>
                      <span className="text-xs text-gray-400">{fmtDateTime(s.scanned_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {sachets.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Aucun sachet enregistré
            </div>
          )}
        </div>

        {/* Recap transport si envoyé */}
        {(envoi.statut === 'envoye' || envoi.statut === 'receptionne') && envoi.nom_transporteur && (
          <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-purple-50 border-b border-purple-200">
              <h2 className="text-sm font-bold text-purple-800 uppercase tracking-wider">
                Prise en charge
              </h2>
            </div>
            <div className="px-4 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Transporteur</p>
                <p className="text-sm font-semibold text-gray-900">{envoi.nom_transporteur}</p>
                <p className="text-xs font-mono text-gray-500">{envoi.visa_transporteur}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Heure de prise en charge</p>
                <p className="text-sm font-medium text-gray-800">
                  {envoi.envoye_at ? fmtDateTime(envoi.envoye_at) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recap réception si réceptionné */}
        {envoi.statut === 'receptionne' && envoi.nom_receptionnaire && (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-200">
              <h2 className="text-sm font-bold text-green-800 uppercase tracking-wider">
                Réception
              </h2>
            </div>
            <div className="px-4 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Réceptionné par</p>
                <p className="text-sm font-semibold text-gray-900">{envoi.nom_receptionnaire}</p>
                <p className="text-xs font-mono text-gray-500">{envoi.visa_receptionnaire}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Heure de réception</p>
                <p className="text-sm font-medium text-gray-800">
                  {envoi.receptionne_at ? fmtDateTime(envoi.receptionne_at) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message final réceptionné */}
        {envoi.statut === 'receptionne' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800 font-bold text-base mb-1">Transport terminé</p>
            <p className="text-green-700 text-sm">
              Ces prélèvements ont été réceptionnés au laboratoire {envoi.dest_nom}.
            </p>
          </div>
        )}

        {/* Formulaire transporteur — statut = valide */}
        {envoi.statut === 'valide' && (
          <FormulaireTransporteur
            envoiId={envoi.id}
            onSuccess={() => {
              setLoading(true);
              loadEnvoi();
            }}
          />
        )}

        {/* Formulaire réceptionnaire — statut = envoye */}
        {envoi.statut === 'envoye' && (
          <FormulaireReceptionnaire
            envoiId={envoi.id}
            onSuccess={() => {
              setLoading(true);
              loadEnvoi();
            }}
          />
        )}

        {/* Bouton impression */}
        <div className="flex justify-center print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-4">
          BioTools — tracabilite-centrifugation.vercel.app · Bon N°{num}
        </div>
      </div>
    </div>
  );
}
