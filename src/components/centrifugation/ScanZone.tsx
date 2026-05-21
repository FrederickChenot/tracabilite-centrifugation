'use client';

import { useRef, useEffect, useState } from 'react';
import { IconPlayerPlay } from '@tabler/icons-react';
import { Tube } from '@/lib/schemas';

type StockageCentri = 'ambiant' | 'plus5' | 'moins20';

const TEMPS: StockageCentri[] = ['ambiant', 'plus5', 'moins20'];

const LABELS: Record<StockageCentri, string> = {
  ambiant: 'Ambiant (15-25°C)',
  plus5:   '+5°C (2-8°C)',
  moins20: '-20°C',
};

const COLORS: Record<StockageCentri, { border: string; header: string; badge: string }> = {
  ambiant: { border: 'border-orange-200', header: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  plus5:   { border: 'border-blue-200',   header: 'bg-blue-50 border-blue-200',     badge: 'bg-blue-100 text-blue-700' },
  moins20: { border: 'border-purple-200', header: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
};

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

interface ScanZoneProps {
  sessionId: string | null;
  tubes: Tube[];
  sessionActive: boolean;
  canStart: boolean;
  onScan: (numEchant: string, stockage: string) => Promise<void>;
  onDelete: (id: string) => void;
  onStartSession: () => Promise<void>;
}

export default function ScanZone({
  sessionId,
  tubes,
  sessionActive,
  canStart,
  onScan,
  onDelete,
  onStartSession,
}: ScanZoneProps) {
  const [scanValues, setScanValues] = useState({ ambiant: '', plus5: '', moins20: '' });
  const [scanning, setScanning] = useState<StockageCentri | null>(null);

  const inputRefs = useRef<Record<StockageCentri, HTMLInputElement | null>>({
    ambiant: null, plus5: null, moins20: null,
  });

  useEffect(() => {
    if (sessionActive) {
      inputRefs.current.ambiant?.focus();
    }
  }, [sessionActive]);

  const tubesByTemp = (temp: StockageCentri) =>
    tubes.filter((t) => t.stockage === temp);

  async function handleScan(temp: StockageCentri) {
    const code = scanValues[temp].trim();
    if (!code || !sessionId || scanning) return;
    setScanning(temp);
    try {
      await onScan(code, temp);
      setScanValues((prev) => ({ ...prev, [temp]: '' }));
    } finally {
      setScanning(null);
      setTimeout(() => inputRefs.current[temp]?.focus(), 50);
    }
  }

  async function handleStartClick() {
    await onStartSession();
    setTimeout(() => inputRefs.current.ambiant?.focus(), 100);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-3 pb-3 pt-2 gap-3">

      {TEMPS.map((temp) => {
        const cols = COLORS[temp];
        const tempTubes = tubesByTemp(temp);
        const isScanning = scanning === temp;

        return (
          <div key={temp} className={`border rounded-lg ${cols.border} overflow-hidden`}>
            {/* En-tête zone */}
            <div className={`${cols.header} px-3 py-2 flex items-center justify-between border-b`}>
              <span className="text-xs font-bold text-gray-700">{LABELS[temp]}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cols.badge}`}>
                {tempTubes.length}
              </span>
            </div>

            {/* Champ de scan */}
            {sessionActive && (
              <div className="px-3 py-2 flex gap-2">
                <input
                  ref={(el) => { inputRefs.current[temp] = el; }}
                  type="text"
                  inputMode="text"
                  value={scanValues[temp]}
                  onChange={(e) => setScanValues((prev) => ({ ...prev, [temp]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleScan(temp); }}
                  disabled={!!scanning}
                  placeholder="Scanner ou saisir..."
                  className="flex-1 min-w-0 border rounded px-2 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50"
                  style={{ fontSize: 15 }}
                />
                <button
                  onClick={() => handleScan(temp)}
                  disabled={!!scanning || !scanValues[temp].trim()}
                  className="px-3 py-2 rounded text-xs font-semibold bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  {isScanning ? '...' : 'OK'}
                </button>
              </div>
            )}

            {/* Liste des tubes */}
            {tempTubes.length > 0 && (
              <div className="divide-y divide-gray-100">
                {tempTubes.map((tube) => (
                  <div key={tube.id} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="flex-1 font-mono text-xs text-gray-800">{tube.num_echant}</span>
                    <span className="text-xs text-gray-400">{fmtTime(tube.scanned_at)}</span>
                    <button
                      onClick={() => onDelete(tube.id)}
                      className="text-gray-400 hover:text-red-500 text-base font-bold leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {sessionActive && tempTubes.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Aucun tube</p>
            )}
          </div>
        );
      })}

      {/* Pied de page */}
      <div className="shrink-0 pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            {tubes.length} tube{tubes.length !== 1 ? 's' : ''} scannés
          </span>
          {sessionId && (
            <span className="text-xs text-teal-600 font-mono">
              #{sessionId.slice(0, 8)}
            </span>
          )}
        </div>

        {!sessionActive && (
          <button
            onClick={handleStartClick}
            disabled={!canStart}
            title={!canStart ? 'Complétez la configuration pour démarrer' : undefined}
            className="w-full flex items-center justify-center gap-2 py-3 rounded text-sm font-semibold transition-colors"
            style={
              canStart
                ? { background: '#0F6E56', color: '#fff' }
                : { background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            <IconPlayerPlay size={16} />
            Nouveau scan
          </button>
        )}
      </div>
    </div>
  );
}
