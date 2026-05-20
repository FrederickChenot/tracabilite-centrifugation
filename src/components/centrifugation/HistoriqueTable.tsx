'use client';

import type { CSSProperties } from 'react';
import { HistoriqueSession } from '@/lib/schemas';

interface HistoriqueTableProps {
  sessions: HistoriqueSession[];
  currentSessionId: string | null;
  onReprendre?: (sessionId: string) => void;
}

const stockageBadgeStyle: Record<string, CSSProperties> = {
  ambiant: { background: '#FFF3E0', color: '#E65100', border: '1px solid #FF9800' },
  '+5': { background: '#E3F2FD', color: '#0D47A1', border: '1px solid #2196F3' },
  '-20': { background: '#EDE7F6', color: '#311B92', border: '1px solid #673AB7' },
};

function StockageDot({ stockage }: { stockage?: string | null }) {
  if (!stockage) return null;
  const colors: Record<string, string> = {
    ambiant: 'bg-orange-300',
    '+5': 'bg-blue-400',
    '-20': 'bg-purple-400',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[stockage] ?? 'bg-gray-300'}`}
      title={stockage}
    />
  );
}

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

function StatutBadge({ statut }: { statut: string }) {
  if (statut === 'ouverte') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-orange-100 text-orange-700">
        En cours
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0 bg-gray-200 text-gray-500">
      Clôturé
    </span>
  );
}

export default function HistoriqueTable({ sessions, currentSessionId, onReprendre }: HistoriqueTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Aucun scan aujourd&apos;hui
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      {/* Mobile : cards */}
      <div className="md:hidden flex flex-col gap-3 p-3">
        {sessions.map((session) => {
          const isCurrent = session.id === currentSessionId;
          const canReprendre = session.statut === 'ouverte' && !isCurrent && onReprendre;
          return (
            <div
              key={session.id}
              className={`rounded-lg border p-3 ${
                isCurrent ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-mono text-gray-500">
                    {formatHeureShort(session.opened_at)}
                    {session.closed_at && ` → ${formatHeureShort(session.closed_at)}`}
                  </p>
                  <p className="font-medium text-gray-800 text-sm mt-0.5">{session.centri_nom}</p>
                </div>
                <StatutBadge statut={session.statut} />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                <span>
                  <span className="font-bold text-gray-700">Pgm {session.prog_numero}</span>
                  {' '}{session.prog_libelle}
                </span>
                {session.stockage && (
                  <span
                    className="px-1.5 py-0.5 rounded font-medium"
                    style={stockageBadgeStyle[session.stockage] ?? {}}
                  >
                    {session.stockage}
                  </span>
                )}
                <span className="font-mono font-bold text-gray-700">Visa : {session.visa}</span>
                <span
                  className="flex items-center justify-center rounded-full text-white font-bold"
                  style={{ background: '#0F6E56', width: 22, height: 22, fontSize: 11 }}
                >
                  {session.tubes.length}
                </span>
              </div>

              {session.tubes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {session.tubes.map((tube) => (
                    <span
                      key={tube.id}
                      title={`${formatHeure(tube.scanned_at)}${tube.stockage ? ' · ' + tube.stockage : ''}`}
                      className={`inline-flex items-center gap-1 font-mono px-1.5 py-0.5 rounded text-xs ${
                        isCurrent
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <StockageDot stockage={tube.stockage} />
                      {tube.num_echant}
                    </span>
                  ))}
                </div>
              )}

              {canReprendre && (
                <button
                  onClick={() => onReprendre(session.id)}
                  className="mt-1 px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 transition-colors"
                >
                  Reprendre →
                </button>
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
            <th className="text-left py-2 px-3 font-semibold text-gray-600 w-32">Statut</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, idx) => {
            const isCurrent = session.id === currentSessionId;
            const canReprendre = session.statut === 'ouverte' && !isCurrent && onReprendre;
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
                  {formatHeure(session.opened_at)}
                  {session.closed_at && (
                    <span className="block text-gray-400">→ {formatHeure(session.closed_at)}</span>
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
                  {(() => {
                    const tubeStockages = [...new Set(session.tubes.map((t) => t.stockage).filter(Boolean))];
                    if (tubeStockages.length === 1) {
                      const s = tubeStockages[0]!;
                      return <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={stockageBadgeStyle[s] ?? {}}>{s}</span>;
                    }
                    if (tubeStockages.length > 1) {
                      return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Multi</span>;
                    }
                    if (session.stockage) {
                      return <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={stockageBadgeStyle[session.stockage] ?? {}}>{session.stockage}</span>;
                    }
                    return <span className="text-xs text-gray-400">—</span>;
                  })()}
                </td>
                <td className="py-2 px-3 font-mono font-bold text-gray-700">
                  {session.visa}
                </td>
                <td className="py-2 px-3 text-center">
                  <span
                    className="inline-flex items-center justify-center rounded-full text-white font-bold"
                    style={{ background: '#0F6E56', width: 22, height: 22, fontSize: 11 }}
                  >
                    {session.tubes.length}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {session.tubes.map((tube) => (
                      <span
                        key={tube.id}
                        title={`${formatHeure(tube.scanned_at)}${tube.stockage ? ' · ' + tube.stockage : ''}`}
                        className={`inline-flex items-center gap-0.5 font-mono px-1 py-0.5 rounded text-xs ${
                          isCurrent
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <StockageDot stockage={tube.stockage} />
                        {tube.num_echant}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-1 items-start">
                    <StatutBadge statut={session.statut} />
                    {canReprendre && (
                      <button
                        onClick={() => onReprendre(session.id)}
                        className="px-2 py-0.5 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 transition-colors whitespace-nowrap"
                      >
                        Reprendre →
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
