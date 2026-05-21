'use client';

import type { CSSProperties } from 'react';
import { HistoriqueSession } from '@/lib/schemas';

interface HistoriqueTableProps {
  sessions: HistoriqueSession[];
  currentSessionId: string | null;
  onReprendre?: (sessionId: string) => void;
  onRouvrir?: (sessionId: string) => void;
}

const stockageLabels: Record<string, { label: string; color: string }> = {
  ambiant: { label: 'Ambiant', color: 'bg-orange-100 text-orange-700 border border-orange-200' },
  plus5:   { label: '+5°C',   color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  moins20: { label: '-20°C',  color: 'bg-purple-100 text-purple-700 border border-purple-200' },
  '+5':    { label: '+5°C',   color: 'bg-blue-100 text-blue-700 border border-blue-200' },
  '-20':   { label: '-20°C',  color: 'bg-purple-100 text-purple-700 border border-purple-200' },
};

const stockageDotBg: Record<string, string> = {
  ambiant: '#FFF3E0', plus5: '#E3F2FD', moins20: '#EDE7F6',
  '+5': '#E3F2FD', '-20': '#EDE7F6',
};

function StockagesBadges({ list }: { list: string[] }) {
  if (list.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((s) => (
        <span key={s} className={`text-xs px-1.5 py-0.5 rounded font-medium ${stockageLabels[s]?.color ?? 'bg-gray-100 text-gray-600'}`}>
          {stockageLabels[s]?.label ?? s}
        </span>
      ))}
    </div>
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

export default function HistoriqueTable({ sessions, currentSessionId, onReprendre, onRouvrir }: HistoriqueTableProps) {
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
          const stockagesTubes = session.stockages_tubes ?? [];
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
                <StockagesBadges list={stockagesTubes} />
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
                    <span key={tube.id} title={formatHeure(tube.scanned_at)} className="flex items-center gap-1">
                      {tube.stockage && (
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ background: stockageDotBg[tube.stockage] }}
                        />
                      )}
                      <span className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                        isCurrent ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tube.num_echant}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-1">
                {session.statut === 'ouverte' && !isCurrent && onReprendre && (
                  <button
                    onClick={() => onReprendre(session.id)}
                    className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 transition-colors"
                  >
                    Reprendre →
                  </button>
                )}
                {session.statut === 'cloturee' && onRouvrir && (
                  <button
                    onClick={() => onRouvrir(session.id)}
                    className="px-3 py-1 text-xs font-semibold rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    ↩ Rouvrir
                  </button>
                )}
              </div>
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
            const stockagesTubes = session.stockages_tubes ?? [];
            const rowBg = isCurrent ? 'bg-teal-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';

            return (
              <tr
                key={session.id}
                className={`border-b border-gray-100 ${rowBg} ${isCurrent ? 'border-l-2 border-l-teal-500' : ''}`}
              >
                <td className="py-2 px-3 font-mono text-gray-500">
                  {formatHeure(session.opened_at)}
                  {session.closed_at && (
                    <span className="block text-gray-400">→ {formatHeure(session.closed_at)}</span>
                  )}
                </td>
                <td className="py-2 px-3 font-medium text-gray-800">{session.centri_nom}</td>
                <td className="py-2 px-3 text-gray-600 max-w-[200px]">
                  <span className="font-bold text-gray-700">Pgm {session.prog_numero}</span>
                  <span className="block text-gray-500 truncate" title={session.prog_libelle}>
                    {session.prog_libelle}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <StockagesBadges list={stockagesTubes} />
                </td>
                <td className="py-2 px-3 font-mono font-bold text-gray-700">{session.visa}</td>
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
                      <span key={tube.id} title={formatHeure(tube.scanned_at)} className="flex items-center gap-0.5">
                        {tube.stockage && (
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ background: stockageDotBg[tube.stockage] }}
                          />
                        )}
                        <span className={`font-mono px-1 py-0.5 rounded text-xs ${
                          isCurrent ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {tube.num_echant}
                        </span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-1 items-start">
                    <StatutBadge statut={session.statut} />
                    {session.statut === 'ouverte' && !isCurrent && onReprendre && (
                      <button
                        onClick={() => onReprendre(session.id)}
                        className="px-2 py-0.5 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 transition-colors whitespace-nowrap"
                      >
                        Reprendre →
                      </button>
                    )}
                    {session.statut === 'cloturee' && onRouvrir && (
                      <button
                        onClick={() => onRouvrir(session.id)}
                        className="px-2 py-0.5 text-xs font-semibold rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        ↩ Rouvrir
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
