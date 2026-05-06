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
    <div className="flex items-center gap-2 py-1 px-2 rounded bg-teal-50 border border-teal-100 group">
      <span className="text-xs text-teal-600 font-bold w-5 text-right shrink-0">{index}</span>
      <span className="flex-1 text-sm font-mono text-gray-800 truncate">{tube.num_echant}</span>
      <span className="text-xs text-gray-400 shrink-0">{formatHeure(tube.scanned_at)}</span>
      <button
        onClick={() => onDelete(tube.id)}
        title="Supprimer ce tube"
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity text-base leading-none px-0.5"
      >
        ×
      </button>
    </div>
  );
}
