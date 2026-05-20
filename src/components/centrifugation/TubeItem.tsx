'use client';

import { Tube } from '@/lib/schemas';

interface TubeItemProps {
  tube: Tube;
  index: number;
  onDelete: (id: string) => void;
  onStockageChange: (id: string, stockage: 'ambiant' | '+5' | '-20') => void;
}

function formatHeure(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const STOCKAGE_OPTS: { v: 'ambiant' | '+5' | '-20'; label: string; active: string; inactive: string }[] = [
  { v: 'ambiant', label: 'Amb', active: 'bg-orange-200 text-orange-800 font-semibold', inactive: 'bg-gray-100 text-gray-400 hover:bg-orange-50' },
  { v: '+5',      label: '+5°', active: 'bg-blue-200 text-blue-800 font-semibold',     inactive: 'bg-gray-100 text-gray-400 hover:bg-blue-50'   },
  { v: '-20',     label: '-20°',active: 'bg-purple-200 text-purple-800 font-semibold', inactive: 'bg-gray-100 text-gray-400 hover:bg-purple-50'  },
];

export default function TubeItem({ tube, index, onDelete, onStockageChange }: TubeItemProps) {
  return (
    <div
      className="flex items-center gap-1.5 py-1.5 px-2 rounded bg-teal-50 border border-teal-100 group"
      style={{ animation: 'slideIn 0.18s ease-out' }}
    >
      <span
        className="shrink-0 flex items-center justify-center text-xs font-bold text-white rounded-full"
        style={{ width: 20, height: 20, minWidth: 20, background: '#0F6E56', fontSize: 11 }}
      >
        {index}
      </span>
      <span className="flex-1 text-sm font-mono text-gray-800 truncate min-w-0">{tube.num_echant}</span>

      {/* Stockage inline */}
      <div className="flex gap-0.5 shrink-0">
        {STOCKAGE_OPTS.map((opt) => (
          <button
            key={opt.v}
            onClick={() => onStockageChange(tube.id, opt.v)}
            title={opt.v}
            className={`text-xs px-1 py-0.5 rounded transition-colors ${
              tube.stockage === opt.v ? opt.active : opt.inactive
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <span className="text-xs text-gray-400 shrink-0 hidden sm:block">{formatHeure(tube.scanned_at)}</span>
      <button
        onClick={() => onDelete(tube.id)}
        title="Supprimer ce tube"
        className="opacity-60 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity text-base leading-none px-0.5 font-bold shrink-0"
      >
        ×
      </button>
    </div>
  );
}
