'use client';

import { useRef, useEffect, useState } from 'react';
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
        <input
          ref={inputRef}
          type="text"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!sessionActive || scanning}
          placeholder={sessionActive ? 'Scanner ou saisir...' : 'Configurer d\'abord la session'}
          autoFocus={sessionActive}
          className={`w-full text-sm border rounded px-2 py-2 font-mono focus:outline-none focus:ring-2 transition-colors ${
            sessionActive
              ? 'border-teal-400 focus:ring-teal-500 bg-white'
              : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        />
        {scanning && (
          <p className="text-xs text-teal-600 mt-1">Enregistrement...</p>
        )}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-0"
        style={{ maxHeight: '260px' }}
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
            className={`w-full py-2 rounded text-sm font-semibold transition-colors ${
              canStart
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Ouvrir la session
          </button>
        )}
      </div>
    </div>
  );
}
