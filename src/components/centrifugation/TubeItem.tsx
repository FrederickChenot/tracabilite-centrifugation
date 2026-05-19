'use client';

import { Tube } from '@/lib/schemas';

interface TubeItemProps {
  tube: Tube;
  index: number;
  onDelete: (id: string) => void;
}

function formatHeure(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function TubeItem({ tube, index, onDelete }: TubeItemProps) {
  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded bg-teal-50 border border-teal-100 group"
      style={{ animation: 'slideIn 0.18s ease-out' }}
    >
      <span
        className="shrink-0 flex items-center justify-center text-xs font-bold text-white rounded-full"
        style={{ width: 20, height: 20, minWidth: 20, background: '#0F6E56', fontSize: 11 }}
      >
        {index}
      </span>
      <span className="flex-1 text-sm font-mono text-gray-800 truncate">{tube.num_echant}</span>
      <span className="text-xs text-gray-400 shrink-0">{formatHeure(tube.scanned_at)}</span>
      <button
        onClick={() => onDelete(tube.id)}
        title="Supprimer ce tube"
        className="opacity-60 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity text-base leading-none px-0.5 font-bold"
      >
        ×
      </button>
    </div>
  );
}
