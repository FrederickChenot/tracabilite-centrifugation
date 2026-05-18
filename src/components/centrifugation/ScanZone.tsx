'use client';

import { useRef, useEffect, useState } from 'react';
import { IconBarcode, IconLock, IconPlayerPlay } from '@tabler/icons-react';
import { Tube } from '@/lib/schemas';
import TubeItem from './TubeItem';

interface ScanZoneProps {
  sessionId: string | null;
  tubes: Tube[];
  sessionActive: boolean;
  canStart: boolean;
  onScan: (numEchant: string) => Promise<void>;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scanValue, setScanValue] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (sessionActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [sessionActive, tubes.length]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [tubes.length]);

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const val = scanValue.trim();
    if (!val || scanning) return;

    setScanning(true);
    try {
      await onScan(val);
      setScanValue('');
    } finally {
      setScanning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleStartClick() {
    await onStartSession();
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-3 pb-3">
      <div className="mb-2">
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Scan tube
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {sessionActive ? (
              <IconBarcode
                size={17}
                className="text-teal-500"
                style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
              />
            ) : (
              <IconLock size={16} className="text-gray-400" />
            )}
          </span>
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!sessionActive || scanning}
            placeholder={
              sessionActive
                ? 'Scanner ou saisir le code-barres...'
                : 'Configurez d\'abord la centrifugeuse, le programme et le stockage'
            }
            autoFocus={sessionActive}
            className="w-full font-mono focus:outline-none transition-colors"
            style={{
              minHeight: 48,
              fontSize: 16,
              paddingLeft: 34,
              paddingRight: 12,
              borderRadius: 6,
              border: sessionActive
                ? '2px dashed #0F6E56'
                : '1px solid #e5e7eb',
              background: sessionActive ? '#fff' : '#f9fafb',
              color: sessionActive ? '#111827' : '#9ca3af',
              cursor: sessionActive ? 'text' : 'not-allowed',
            }}
          />
        </div>
        {sessionActive ? (
          <p className="text-xs text-gray-400 mt-1">Appuyez sur Entrée après chaque scan</p>
        ) : (
          <p className="text-xs text-gray-400 mt-1 leading-snug">
            Configurez d&apos;abord la centrifugeuse, le programme et le stockage
          </p>
        )}
        {scanning && (
          <p className="text-xs text-teal-600 mt-0.5">Enregistrement...</p>
        )}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-0"
        style={{ maxHeight: 260 }}
      >
        {tubes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {sessionActive ? 'Aucun tube scanné' : ''}
          </p>
        ) : (
          tubes.map((tube, i) => (
            <TubeItem key={tube.id} tube={tube} index={i + 1} onDelete={onDelete} />
          ))
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
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
