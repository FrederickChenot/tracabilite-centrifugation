'use client';

interface TopbarProps {
  sessionActive: boolean;
  tubeCount: number;
  onCloturer: () => void;
  onExportPdf: () => void;
}

export default function Topbar({ sessionActive, tubeCount, onCloturer, onExportPdf }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1">
        <h1 className="text-lg font-bold text-gray-900">Traçabilité Centrifugation</h1>
      </div>

      {sessionActive && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
          Session en cours · {tubeCount} tube{tubeCount !== 1 ? 's' : ''}
        </span>
      )}

      <button
        onClick={onExportPdf}
        className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Export PDF
      </button>

      {sessionActive && (
        <button
          onClick={onCloturer}
          className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
        >
          Clôturer session
        </button>
      )}
    </header>
  );
}
