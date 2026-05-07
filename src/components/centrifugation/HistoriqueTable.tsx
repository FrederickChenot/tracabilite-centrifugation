'use client';

import { HistoriqueSession } from '@/lib/schemas';

interface HistoriqueTableProps {
  sessions: HistoriqueSession[];
  currentSessionId: string | null;
}

const stockageBadge: Record<string, string> = {
  'ambiant': 'bg-amber-100 text-amber-700',
  '+5': 'bg-blue-100 text-blue-700',
  '-20': 'bg-gray-100 text-gray-600',
};

function formatHeure(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatHeureShort(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoriqueTable({ sessions, currentSessionId }: HistoriqueTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Aucun passage aujourd&apos;hui
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      {/* Mobile : cards */}
      <div className="md:hidden flex flex-col gap-3 p-3">
        {sessions.map((session) => {
          const isCurrent = session.id === currentSessionId;
          return (
            <div
              key={session.id}
              className={`rounded-lg border p-3 ${
                isCurrent ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Header card */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-mono text-gray-500">
                    {formatHeureShort(session.opened_at)}
                    {session.closed_at && ` → ${formatHeureShort(session.closed_at)}`}
                  </p>
                  <p className="font-medium text-gray-800 text-sm mt-0.5">{session.centri_nom}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    session.statut === 'ouverte'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {session.statut === 'ouverte' ? 'En cours' : 'Clôturé'}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                <span>
                  <span className="font-bold text-gray-700">Pgm {session.prog_numero}</span>
                  {' '}{session.prog_libelle}
                </span>
                <span className={`px-1.5 py-0.5 rounded font-medium ${stockageBadge[session.stockage] ?? ''}`}>
                  {session.stockage}
                </span>
                <span className="font-mono font-bold text-gray-700">Visa : {session.visa}</span>
                <span className="font-bold text-gray-700">{session.tubes.length} tube{session.tubes.length !== 1 ? 's' : ''}</span>
              </div>

              {session.tubes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {session.tubes.map((tube) => (
                    <span
                      key={tube.id}
                      title={formatHeure(tube.scanned_at)}
                      className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                        isCurrent
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tube.num_echant}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop : tableau */}
      <table className="hidden md:table w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left py-2 px-3 font-semibold text-gray-600 w-28">Heure</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Centrifugeuse</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Programme</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600 w-20">Stockage</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600 w-12">Visa</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600 w-12">Tubes</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600">Échantillons</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-600 w-20">Statut</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, idx) => {
            const isCurrent = session.id === currentSessionId;
            const rowBg = isCurrent
              ? 'bg-teal-50'
              : idx % 2 === 0
              ? 'bg-white'
              : 'bg-gray-50/50';

            return (
              <tr
                key={session.id}
                className={`border-b border-gray-100 ${rowBg} ${
                  isCurrent ? 'border-l-2 border-l-teal-500' : ''
                }`}
              >
                <td className="py-2 px-3 font-mono text-gray-500">
                  {formatHeureShort(session.opened_at)}
                  {session.closed_at && (
                    <span className="block text-gray-400">→ {formatHeureShort(session.closed_at)}</span>
                  )}
                </td>
                <td className="py-2 px-3 font-medium text-gray-800">
                  {session.centri_nom}
                </td>
                <td className="py-2 px-3 text-gray-600 max-w-[200px]">
                  <span className="font-bold text-gray-700">Pgm {session.prog_numero}</span>
                  <span className="block text-gray-500 truncate" title={session.prog_libelle}>
                    {session.prog_libelle}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${stockageBadge[session.stockage] ?? ''}`}>
                    {session.stockage}
                  </span>
                </td>
                <td className="py-2 px-3 font-mono font-bold text-gray-700">
                  {session.visa}
                </td>
                <td className="py-2 px-3 text-center font-bold text-gray-700">
                  {session.tubes.length}
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {session.tubes.map((tube) => (
                      <span
                        key={tube.id}
                        title={formatHeure(tube.scanned_at)}
                        className={`font-mono px-1 py-0.5 rounded text-xs ${
                          isCurrent
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tube.num_echant}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      session.statut === 'ouverte'
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {session.statut === 'ouverte' ? 'En cours' : 'Clôturé'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
