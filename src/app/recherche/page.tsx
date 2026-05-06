'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { RechercheResult, FilterState, Centrifugeuse } from '@/lib/schemas';

/* ─── Helpers ────────────────────────────────────────────── */

const EMPTY_FILTERS: FilterState = {
  site_id: null,
  centri_id: null,
  date_debut: '',
  date_fin: '',
  visa: '',
  stockage: '',
  avec_remarque: false,
};

const SITES = [
  { id: 1, label: 'Épinal' },
  { id: 2, label: 'Remiremont' },
  { id: 3, label: 'Neufchâteau' },
];

const STOCKAGE_OPTIONS = [
  { value: 'ambiant' as const, label: 'Ambiant', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: '+5'     as const, label: '+5°C',    cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: '-20'    as const, label: '-20°C',   cls: 'bg-gray-100 text-gray-600 border-gray-300' },
];

function buildParams(q: string, f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (q.trim())        p.set('q',            q.trim());
  if (f.site_id)       p.set('site_id',      String(f.site_id));
  if (f.centri_id)     p.set('centri_id',    String(f.centri_id));
  if (f.date_debut)    p.set('date_debut',   f.date_debut);
  if (f.date_fin)      p.set('date_fin',     f.date_fin);
  if (f.visa.trim())   p.set('visa',         f.visa.trim());
  if (f.stockage)      p.set('stockage',     f.stockage);
  if (f.avec_remarque) p.set('avec_remarque','true');
  return p;
}

function hasActiveFilter(f: FilterState): boolean {
  return !!(f.site_id || f.centri_id || f.date_debut || f.date_fin || f.visa || f.stockage || f.avec_remarque);
}

function hasDateFilter(f: FilterState): boolean {
  return !!(f.date_debut || f.date_fin);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const stockageBadge: Record<string, string> = {
  ambiant: 'bg-amber-100 text-amber-700',
  '+5':    'bg-blue-100 text-blue-700',
  '-20':   'bg-gray-100 text-gray-600',
};

/* ─── Result card ────────────────────────────────────────── */

function ResultCard({ r }: { r: RechercheResult }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-teal-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-mono font-bold text-gray-900 text-base">{r.num_echant}</span>
            <span className="text-xs text-gray-400">{fmtDate(r.scanned_at)} — {fmtTime(r.scanned_at)}</span>
            <span className="text-xs text-gray-500">{r.site_nom}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-600">
            <span className="font-medium">
              {r.est_backup && <span className="text-amber-600 mr-1">[BK]</span>}
              {r.centrifugeuse}
            </span>
            <span className="text-gray-300">·</span>
            <span>
              <span className="font-bold text-gray-700">Pgm {r.prog_numero}</span>
              <span className="ml-1 text-gray-500 truncate">{r.prog_libelle}</span>
            </span>
          </div>
          {r.remarque && (
            <div className="mt-1.5 flex items-start gap-1 text-xs text-teal-700 bg-teal-50 rounded px-2 py-1">
              <span className="shrink-0">💬</span>
              <span>{r.remarque}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${stockageBadge[r.stockage]}`}>
            {r.stockage}
          </span>
          <span className="font-mono font-bold text-gray-700 text-xs">{r.visa}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── PDF generation ─────────────────────────────────────── */

async function generateAuditPdf(results: RechercheResult[], filters: FilterState) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.width;

  /* En-tête */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(14, 110, 86);
  doc.text('CH Épinal — GCS Bio Med — Traçabilité Centrifugation', pageW / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const periode = filters.date_debut || filters.date_fin
    ? `Période : ${filters.date_debut ? fmtDate(filters.date_debut + 'T00:00:00') : '…'} → ${filters.date_fin ? fmtDate(filters.date_fin + 'T00:00:00') : '…'}`
    : 'Période : toutes dates';
  doc.text(periode, pageW / 2, 23, { align: 'center' });

  const siteNoms = filters.site_id
    ? SITES.find((s) => s.id === filters.site_id)?.label ?? ''
    : 'Tous les sites';
  doc.text(`Site(s) : ${siteNoms}`, pageW / 2, 29, { align: 'center' });
  doc.text(`${results.length} tube(s) trouvé(s)`, pageW / 2, 35, { align: 'center' });

  /* Tri ASC pour le PDF */
  const sorted = [...results].sort(
    (a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  );

  /* Regroupement par session */
  const bySession = new Map<string, RechercheResult[]>();
  for (const r of sorted) {
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, []);
    bySession.get(r.session_id)!.push(r);
  }

  interface PdfCell {
    content: string;
    colSpan?: number;
    styles?: Record<string, unknown>;
  }
  type PdfRow = (string | PdfCell)[];

  /* Corps du tableau */
  const body: PdfRow[] = [];
  for (const tubes of bySession.values()) {
    const first = tubes[0];
    const sessionLabel = [
      fmtDate(first.opened_at),
      first.site_nom,
      first.centrifugeuse,
      `Pgm ${first.prog_numero}`,
      first.stockage,
      first.visa,
      `${tubes.length} tube(s)`,
    ].join('  ·  ');

    body.push([
      {
        content: sessionLabel,
        colSpan: 8,
        styles: { fillColor: [230, 245, 240], textColor: [14, 110, 86], fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
      },
    ]);

    for (const tube of tubes) {
      body.push([
        fmtDate(tube.scanned_at),
        fmtTime(tube.scanned_at),
        tube.num_echant,
        (tube.est_backup ? '[BK] ' : '') + tube.centrifugeuse,
        `${tube.prog_numero} — ${tube.prog_libelle}`,
        tube.stockage,
        tube.visa,
        tube.remarque ?? '',
      ]);
    }
  }

  autoTable(doc, {
    startY: 41,
    head: [['Date', 'Heure', 'N° Échantillon', 'Centrifugeuse', 'Programme', 'Stockage', 'Visa', 'Remarque']],
    body,
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [14, 110, 86], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 35, font: 'courier' },
      3: { cellWidth: 38 },
      4: { cellWidth: 65 },
      5: { cellWidth: 20 },
      6: { cellWidth: 18 },
      7: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  /* Sous-totaux par centrifugeuse */
  const byCentri = new Map<string, number>();
  for (const r of results) byCentri.set(r.centrifugeuse, (byCentri.get(r.centrifugeuse) ?? 0) + 1);

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 200;
  if (finalY + 30 < doc.internal.pageSize.height - 20) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(14, 110, 86);
    doc.text('Sous-totaux par centrifugeuse', 14, finalY + 8);
    autoTable(doc, {
      startY: finalY + 12,
      head: [['Centrifugeuse', 'Tubes']],
      body: Array.from(byCentri.entries()).map(([nom, nb]) => [nom, nb]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [14, 110, 86], textColor: 255, fontStyle: 'bold' },
      tableWidth: 80,
    });
  }

  /* Pied de page */
  const pageCount = doc.getNumberOfPages();
  const generatedAt = new Date().toLocaleString('fr-FR');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Généré le ${generatedAt} — Données certifiées — BioTools — Page ${i} / ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.height - 6,
      { align: 'center' }
    );
  }

  const filename = `audit-centri_${filters.date_debut || 'debut'}_${filters.date_fin || 'fin'}.pdf`;
  doc.save(filename);
}

/* ─── Page principale ─────────────────────────────────────── */

export default function RecherchePage() {
  const [sidebarSiteId, setSidebarSiteId] = useState(1);
  const [query, setQuery]       = useState('');
  const [filters, setFilters]   = useState<FilterState>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults]   = useState<RechercheResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [centrifugeuses, setCentrifugeuses] = useState<Centrifugeuse[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFilters = useRef(filters);
  latestFilters.current = filters;
  const abortRef = useRef<AbortController | null>(null);

  /* ── autoFocus ── */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* ── Charger centrifugeuses quand site change ── */
  useEffect(() => {
    if (!filters.site_id) { setCentrifugeuses([]); return; }
    fetch(`/api/admin/centrifugeuses?site_id=${filters.site_id}`)
      .then((r) => r.json())
      .then((d) => setCentrifugeuses(d.centrifugeuses ?? []));
  }, [filters.site_id]);

  /* ── Fetch ── */
  const performSearch = useCallback(async (q: string, f: FilterState) => {
    const params = buildParams(q, f);
    if (!params.toString()) { setResults([]); setSearched(false); return; }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const res = await fetch(`/api/centri/recherche?${params}`, { signal: abortRef.current.signal });
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Query change avec debounce 500ms ── */
  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim() && !hasActiveFilter(latestFilters.current)) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => performSearch(val, latestFilters.current), 500);
  }

  /* ── Enter déclenche immédiatement ── */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(query, filters);
  }

  /* ── Mise à jour filtre ── */
  function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'site_id') next.centri_id = null;
      return next;
    });
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setCentrifugeuses([]);
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true);
    try {
      await generateAuditPdf(results, filters);
    } finally {
      setGeneratingPdf(false);
    }
  }

  const activeFilterCount = [
    filters.site_id, filters.centri_id, filters.date_debut, filters.date_fin,
    filters.visa, filters.stockage, filters.avec_remarque,
  ].filter(Boolean).length;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar siteId={sidebarSiteId} onSiteChange={setSidebarSiteId} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">
          <h1 className="text-lg font-bold text-gray-900">Recherche</h1>
          {searched && !loading && (
            <span className="text-sm text-gray-500">
              {results.length} résultat{results.length !== 1 ? 's' : ''}
            </span>
          )}
          {loading && (
            <span className="text-sm text-teal-600 animate-pulse">Recherche...</span>
          )}
          {hasDateFilter(filters) && results.length > 0 && (
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
            >
              {generatingPdf ? 'Génération...' : 'Générer rapport audit'}
            </button>
          )}
        </header>

        {/* ── Main ── */}
        <main className="flex-1 overflow-auto px-6 py-5 space-y-4">

          {/* ── Barre de recherche ── */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-2xl">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">⌕</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scanner ou saisir un numéro d'échantillon..."
                className="w-full pl-9 pr-4 py-3 text-sm border-2 border-gray-300 rounded-xl font-mono focus:outline-none focus:border-teal-500 transition-colors bg-white shadow-sm"
                autoFocus
              />
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              Filtres
              {activeFilterCount > 0 && (
                <span className="bg-teal-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Panneau filtres ── */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                {/* Site */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Site</label>
                  <select
                    value={filters.site_id ?? ''}
                    onChange={(e) => setFilter('site_id', e.target.value ? Number(e.target.value) : null)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Tous</option>
                    {SITES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                {/* Centrifugeuse */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Centrifugeuse</label>
                  <select
                    value={filters.centri_id ?? ''}
                    onChange={(e) => setFilter('centri_id', e.target.value ? Number(e.target.value) : null)}
                    disabled={!filters.site_id}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Toutes</option>
                    {centrifugeuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.est_backup ? '[BK] ' : ''}{c.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date début */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date début</label>
                  <input
                    type="date"
                    value={filters.date_debut}
                    onChange={(e) => setFilter('date_debut', e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Date fin */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date fin</label>
                  <input
                    type="date"
                    value={filters.date_fin}
                    onChange={(e) => setFilter('date_fin', e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Visa */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Visa opérateur</label>
                  <input
                    type="text"
                    value={filters.visa}
                    onChange={(e) => setFilter('visa', e.target.value.toUpperCase())}
                    placeholder="ex: DUPJ"
                    maxLength={5}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Stockage */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Stockage</label>
                  <div className="flex gap-1">
                    {STOCKAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFilter('stockage', filters.stockage === opt.value ? '' : opt.value)}
                        className={`flex-1 text-xs py-1.5 rounded border font-medium transition-all ${
                          filters.stockage === opt.value
                            ? opt.cls + ' ring-2 ring-offset-1 ring-current'
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avec remarque */}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.avec_remarque}
                      onChange={(e) => setFilter('avec_remarque', e.target.checked)}
                      className="w-4 h-4 accent-teal-600"
                    />
                    <span className="text-sm text-gray-700">Avec remarque seulement</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => performSearch(query, filters)}
                  className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
                >
                  Rechercher
                </button>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { resetFilters(); performSearch(query, EMPTY_FILTERS); }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
                {hasDateFilter(filters) && (
                  <span className="ml-auto text-xs text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg">
                    Mode audit activé — utilisez "Générer rapport audit" après la recherche
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Résultats ── */}
          {searched && !loading && results.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">⌕</div>
              <p className="text-sm">Aucun résultat pour ces critères</p>
            </div>
          )}

          {!searched && !loading && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4 text-gray-200">⌕</div>
              <p className="text-sm">Scanner un code-barres ou saisir un numéro pour commencer</p>
              <p className="text-xs mt-1 text-gray-300">Recherche partielle — min. 2 caractères</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-gray-500 pb-1">
                <span>{results.length} résultat{results.length !== 1 ? 's' : ''}</span>
                {results.length === 500 && (
                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Limite 500 — affinez les filtres</span>
                )}
                <span className="ml-auto">Trié par heure décroissante</span>
              </div>
              {results.map((r) => <ResultCard key={r.id} r={r} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
