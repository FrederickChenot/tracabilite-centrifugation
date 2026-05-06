'use client';

import { CentrifugeusesAvecProgrammes } from '@/lib/schemas';

interface SessionConfigProps {
  centrifugeuses: CentrifugeusesAvecProgrammes[];
  selectedCentri: number | null;
  selectedProg: number | null;
  stockage: 'ambiant' | '+5' | '-20' | null;
  visa: string;
  sessionActive: boolean;
  onCentriChange: (id: number) => void;
  onProgChange: (id: number) => void;
  onStockageChange: (s: 'ambiant' | '+5' | '-20') => void;
  onVisaChange: (v: string) => void;
}

const stockageOptions: { value: 'ambiant' | '+5' | '-20'; label: string; color: string }[] = [
  { value: 'ambiant', label: 'Ambiant', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: '+5', label: '+5°C', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: '-20', label: '-20°C', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

export default function SessionConfig({
  centrifugeuses,
  selectedCentri,
  selectedProg,
  stockage,
  visa,
  sessionActive,
  onCentriChange,
  onProgChange,
  onStockageChange,
  onVisaChange,
}: SessionConfigProps) {
  const normales = centrifugeuses.filter((c) => !c.est_backup);
  const backups = centrifugeuses.filter((c) => c.est_backup);
  const programmes = centrifugeuses.find((c) => c.id === selectedCentri)?.programmes ?? [];

  return (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Centrifugeuse
        </label>
        <select
          value={selectedCentri ?? ''}
          onChange={(e) => onCentriChange(Number(e.target.value))}
          disabled={sessionActive}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500"
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
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Programme
        </label>
        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded bg-white">
          {programmes.length === 0 ? (
            <p className="text-xs text-gray-400 p-2">Sélectionner une centrifugeuse</p>
          ) : (
            programmes.map((p) => (
              <button
                key={p.id}
                onClick={() => onProgChange(p.id)}
                disabled={sessionActive}
                className={`w-full text-left px-2 py-1.5 text-xs border-b last:border-b-0 border-gray-100 transition-colors disabled:cursor-not-allowed ${
                  selectedProg === p.id
                    ? 'bg-teal-600 text-white'
                    : 'hover:bg-teal-50 text-gray-700'
                }`}
              >
                <span className="font-bold mr-1.5">Pgm {p.numero}</span>
                {p.libelle}
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Stockage
        </label>
        <div className="flex gap-1">
          {stockageOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStockageChange(opt.value)}
              disabled={sessionActive}
              className={`flex-1 text-xs py-1.5 px-1 rounded border font-medium transition-all disabled:cursor-not-allowed ${
                stockage === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Visa
        </label>
        <input
          type="text"
          value={visa}
          onChange={(e) => onVisaChange(e.target.value.toUpperCase().slice(0, 5))}
          disabled={sessionActive}
          placeholder="Ex: DUPJ"
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 uppercase disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500"
          maxLength={5}
        />
      </div>
    </div>
  );
}
