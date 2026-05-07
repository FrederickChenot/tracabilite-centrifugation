'use client';

interface TopbarProps {
  sessionActive: boolean;
  tubeCount: number;
  onCloturer: () => void;
  onExportPdf: () => void;
  onOpenSidebar?: () => void;
}

export default function Topbar({
  sessionActive,
  tubeCount,
  onCloturer,
  onExportPdf,
  onOpenSidebar,
}: TopbarProps) {
  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-3 md:px-6 gap-2 md:gap-4 shrink-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onOpenSidebar}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded text-gray-600 hover:bg-gray-100 shrink-0"
          aria-label="Ouvrir le menu"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-lg font-bold text-gray-900 truncate">
            Traçabilité Centrifugation
          </h1>
        </div>

        {sessionActive && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 shrink-0">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
            Scan en cours · {tubeCount} tube{tubeCount !== 1 ? 's' : ''}
          </span>
        )}

        <button
          onClick={onExportPdf}
          className="hidden sm:block text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
        >
          Export PDF
        </button>

        {/* Desktop close button — hidden on mobile (sticky button used instead) */}
        {sessionActive && (
          <button
            onClick={onCloturer}
            className="hidden md:block text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors font-medium shrink-0"
          >
            Terminer
          </button>
        )}
      </header>

      {/* Sticky bottom button — mobile only, visible when passage en cours */}
      {sessionActive && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white border-t border-gray-200"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <button
            onClick={onCloturer}
            className="w-full bg-teal-600 text-white font-semibold text-base"
            style={{ height: '56px' }}
          >
            Terminer
          </button>
        </div>
      )}
    </>
  );
}
