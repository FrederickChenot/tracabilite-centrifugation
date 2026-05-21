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

const COLORS: Record<StockageCentri, { zone: string; badge: string }> = {
  ambiant: { zone: 'border-orange-200 bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
  plus5:   { zone: 'border-blue-200 bg-blue-50',     badge: 'bg-blue-100 text-blue-700' },
  moins20: { zone: 'border-purple-200 bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
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

  const scanRefs = useRef<Record<StockageCentri, HTMLInputElement | null>>({
    ambiant: null, plus5: null, moins20: null,
  });

  useEffect(() => {
    if (sessionActive) {
      scanRefs.current.ambiant?.focus();
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
      setTimeout(() => scanRefs.current[temp]?.focus(), 50);
    }
  }

  async function handleStartClick() {
    await onStartSession();
    setTimeout(() => scanRefs.current.ambiant?.focus(), 100);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-3 pb-3 pt-2 gap-2">

      {TEMPS.map((temp) => {
        const cols = COLORS[temp];
        const tempTubes = tubesByTemp(temp);

        return (
          <div key={temp} className={`border rounded-lg ${cols.zone}`}>

            {/* Header */}
            <div className="px-3 py-2 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700">{LABELS[temp]}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cols.badge}`}>
                {tempTubes.length}
              </span>
            </div>

            {/* Input scan — toujours visible */}
            <div className="px-3 pb-2 flex gap-1">
              <input
                ref={(el) => { scanRefs.current[temp] = el; }}
                type="text"
                inputMode="text"
                value={scanValues[temp]}
                onChange={(e) => setScanValues((prev) => ({ ...prev, [temp]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScan(temp);
                  }
                }}
                placeholder="Scanner ou saisir..."
                disabled={!sessionActive || !!scanning}
                className="flex-1 min-w-0 border border-gray-300 bg-white rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{ fontSize: 16 }}
              />
              <button
                onClick={() => handleScan(temp)}
                disabled={!scanValues[temp].trim() || !sessionActive || !!scanning}
                className="px-3 py-2 text-sm font-semibold bg-teal-600 text-white rounded disabled:opacity-40 transition-colors"
              >
                {scanning === temp ? '...' : 'OK'}
              </button>
            </div>

            {/* Liste des tubes */}
            {tempTubes.map((tube) => (
              <div
                key={tube.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border-t border-gray-100"
              >
                <span className="flex-1 font-mono text-xs text-gray-800">{tube.num_echant}</span>
                <span className="text-xs text-gray-400">{fmtTime(tube.scanned_at)}</span>
                <button
                  onClick={() => onDelete(tube.id)}
                  className="text-red-400 hover:text-red-600 text-base font-bold leading-none transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Pied de page */}
      <div className="shrink-0 pt-2 border-t border-gray-200 mt-1">
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
