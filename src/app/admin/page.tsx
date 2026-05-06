'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { HistoriqueSession } from '@/lib/schemas';
import ReferentielsTab from '@/components/admin/ReferentielsTab';

type Tab = 'sessions' | 'referentiels';

function todayDate(): string {
  return new Date().toLocaleDateString('fr-CA');
}

function dateMinusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('fr-CA');
}

interface Metrics {
  tubesToday: number;
  sessionsTodayCount: number;
  tubesWeek: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('sessions');

  /* ── Sessions tab state ── */
  const [siteId, setSiteId] = useState(1);
  const [date, setDate] = useState(todayDate());
  const [sessions, setSessions] = useState<HistoriqueSession[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ tubesToday: 0, sessionsTodayCount: 0, tubesWeek: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/centri/historique?site_id=${siteId}&date=${date}`);
      const data = await res.json();
      const s: HistoriqueSession[] = data.sessions ?? [];
      setSessions(s);
      setMetrics((prev) => ({
        ...prev,
        tubesToday: s.reduce((acc, sess) => acc + sess.tubes.length, 0),
        sessionsTodayCount: s.length,
      }));
    } finally {
      setLoading(false);
    }
  }, [siteId, date]);

  const loadWeekMetrics = useCallback(async () => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`/api/centri/historique?site_id=${siteId}&date=${dateMinusDays(i)}`);
      const data = await res.json();
      const s: HistoriqueSession[] = data.sessions ?? [];
      total += s.reduce((acc, sess) => acc + sess.tubes.length, 0);
    }
    setMetrics((prev) => ({ ...prev, tubesWeek: total }));
  }, [siteId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { loadWeekMetrics(); }, [loadWeekMetrics]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const rows: string[][] = [
      ['Session ID', 'Centrifugeuse', 'Programme', 'Stockage', 'Visa', 'Ouverture', 'Clôture', 'Statut', 'Tube', 'Heure scan'],
    ];
    for (const s of sessions) {
      if (s.tubes.length === 0) {
        rows.push([s.id, s.centri_nom ?? '', s.prog_libelle ?? '', s.stockage, s.visa, s.opened_at, s.closed_at ?? '', s.statut, '', '']);
      } else {
        for (const t of s.tubes) {
          rows.push([s.id, s.centri_nom ?? '', s.prog_libelle ?? '', s.stockage, s.visa, s.opened_at, s.closed_at ?? '', s.statut, t.num_echant, t.scanned_at]);
        }
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `centrifugation_${date}_site${siteId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const siteName = siteId === 1 ? 'Épinal' : siteId === 2 ? 'Remiremont' : 'Neufchâteau';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'sessions', label: 'Sessions' },
    { id: 'referentiels', label: 'Référentiels' },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Accueil</Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Administration · Centrifugation</h1>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Déconnexion
        </button>
      </header>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* Sessions tab */}
        {activeTab === 'sessions' && (
          <div className="h-full overflow-auto">
            <div className="max-w-7xl mx-auto p-6 space-y-6">

              {/* Filtres */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex gap-2">
                  {[{ id: 1, label: 'Épinal' }, { id: 2, label: 'Remiremont' }, { id: 3, label: 'Neufchâteau' }].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSiteId(s.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        siteId === s.id ? 'bg-teal-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={exportCsv}
                  className="ml-auto text-sm px-4 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                >
                  Export CSV
                </button>
              </div>

              {/* Métriques */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: `Tubes · ${date} · ${siteName}`, value: metrics.tubesToday },
                  { label: `Sessions · ${date} · ${siteName}`, value: metrics.sessionsTodayCount },
                  { label: `Tubes 7 jours · ${siteName}`, value: metrics.tubesWeek },
                ].map((m) => (
                  <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                    <p className="text-4xl font-bold text-gray-900">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Tableau sessions */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900 text-sm">Sessions</h2>
                  {loading && <span className="text-xs text-gray-400">Chargement...</span>}
                </div>

                {sessions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">Aucune session pour cette date</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Heure</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Centrifugeuse</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Programme</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Stockage</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Visa</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Tubes</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Statut</th>
                        <th className="py-2 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <>
                          <tr
                            key={s.id}
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleExpand(s.id)}
                          >
                            <td className="py-2 px-4 font-mono text-xs text-gray-500">
                              {new Date(s.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-4 font-medium text-gray-800">{s.centri_nom}</td>
                            <td className="py-2 px-4 text-gray-600 text-xs max-w-[200px] truncate">
                              <span className="font-bold">Pgm {s.prog_numero}</span> {s.prog_libelle}
                            </td>
                            <td className="py-2 px-4">
                              <span className="text-xs font-medium text-gray-600">{s.stockage}</span>
                            </td>
                            <td className="py-2 px-4 font-mono font-bold text-gray-700">{s.visa}</td>
                            <td className="py-2 px-4 font-bold text-gray-800">{s.tubes.length}</td>
                            <td className="py-2 px-4">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.statut === 'ouverte' ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-500'}`}>
                                {s.statut === 'ouverte' ? 'En cours' : 'Clôturée'}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-gray-400 text-xs">
                              {expanded.has(s.id) ? '▲' : '▼'}
                            </td>
                          </tr>
                          {expanded.has(s.id) && (
                            <tr key={`${s.id}-detail`} className="bg-gray-50">
                              <td colSpan={8} className="px-8 py-3">
                                {s.tubes.length === 0 ? (
                                  <p className="text-xs text-gray-400">Aucun tube</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {s.tubes.map((t, i) => (
                                      <div key={t.id} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1">
                                        <span className="text-xs text-gray-400 font-bold">{i + 1}</span>
                                        <span className="font-mono text-xs text-gray-700">{t.num_echant}</span>
                                        <span className="text-xs text-gray-400">
                                          {new Date(t.scanned_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Référentiels tab */}
        {activeTab === 'referentiels' && (
          <div className="h-full bg-white">
            <ReferentielsTab />
          </div>
        )}
      </div>
    </div>
  );
}
