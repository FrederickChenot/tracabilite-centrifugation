'use client';

import {
  IconRotateClockwise2,
  IconChevronDown,
  IconCheck,
  IconUser,
} from '@tabler/icons-react';
import { CentrifugeusesAvecProgrammes } from '@/lib/schemas';

interface SessionConfigProps {
  centrifugeuses: CentrifugeusesAvecProgrammes[];
  selectedCentri: number | null;
  selectedProg: number | null;
  visa: string;
  sessionActive: boolean;
  onCentriChange: (id: number) => void;
  onProgChange: (id: number) => void;
  onVisaChange: (v: string) => void;
}

export default function SessionConfig({
  centrifugeuses,
  selectedCentri,
  selectedProg,
  visa,
  sessionActive,
  onCentriChange,
  onProgChange,
  onVisaChange,
}: SessionConfigProps) {
  const normales = centrifugeuses.filter((c) => !c.est_backup);
  const backups = centrifugeuses.filter((c) => c.est_backup);
  const programmes = centrifugeuses.find((c) => c.id === selectedCentri)?.programmes ?? [];

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Centrifugeuse */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Centrifugeuse
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-teal-600 pointer-events-none">
            <IconRotateClockwise2 size={15} />
          </span>
          <select
            value={selectedCentri ?? ''}
            onChange={(e) => onCentriChange(Number(e.target.value))}
            disabled={sessionActive}
            className={`w-full text-sm border rounded pl-8 pr-7 py-2 appearance-none bg-white
              disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none
              focus:border-teal-500 focus:ring-1 focus:ring-teal-400 transition-colors
              hover:bg-gray-50 disabled:hover:bg-gray-100
              ${selectedCentri ? 'font-bold text-gray-800' : 'text-gray-500'}
              ${selectedCentri ? 'border-teal-300' : 'border-gray-300'}`}
          >
            <option value="">Choisir...</option>
            {normales.length > 0 && (
              <optgroup label="Centrifugeuses">
                {normales.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </optgroup>
            )}
            {backups.length > 0 && (
              <optgroup label="Back-up">
                {backups.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </optgroup>
            )}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <IconChevronDown size={14} />
          </span>
        </div>
      </div>

      {/* Programme */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Programme
        </label>
        <div className="border border-gray-200 rounded overflow-hidden" style={{ maxHeight: 200, overflowY: 'auto' }}>
          {programmes.length === 0 ? (
            <p className="text-xs text-gray-400 p-3 text-center">Sélectionner une centrifugeuse</p>
          ) : (
            programmes.map((p) => {
              const selected = selectedProg === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onProgChange(p.id)}
                  disabled={sessionActive}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-2 border-b last:border-b-0 border-gray-100 transition-all duration-150 disabled:cursor-not-allowed"
                  style={selected ? { background: '#E1F5EE', borderColor: '#0F6E56' } : undefined}
                >
                  <span
                    className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded"
                    style={selected ? { background: '#0F6E56', color: '#fff' } : { background: '#f3f4f6', color: '#6b7280' }}
                  >
                    {p.numero}
                  </span>
                  <span
                    className="flex-1 text-xs truncate"
                    style={selected ? { color: '#085041', fontWeight: 600 } : { color: '#6b7280' }}
                  >
                    {p.libelle}
                  </span>
                  {selected && <IconCheck size={14} className="shrink-0" style={{ color: '#0F6E56' }} />}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Visa */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Visa
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <IconUser size={15} />
          </span>
          <input
            type="text"
            value={visa}
            onChange={(e) => onVisaChange(e.target.value.toUpperCase().slice(0, 5))}
            disabled={sessionActive}
            placeholder="Vos initiales (ex: FD)"
            style={{ textTransform: 'uppercase' }}
            className="w-full text-sm border border-gray-300 rounded pl-8 pr-2 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400 transition-colors"
            maxLength={5}
          />
        </div>
      </div>
    </div>
  );
}
