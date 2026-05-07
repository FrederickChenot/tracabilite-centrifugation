'use client';

import { useState, useEffect, useCallback } from 'react';
import { Site, Centrifugeuse, Programme, LaboratoireDest } from '@/lib/schemas';
import Toast, { useToast } from './Toast';

type ReferentielsSubTab = 'centrifugation' | 'destinataires';

/* ─── Types locaux ───────────────────────────────────────────── */

interface CentriForm { nom: string; modele: string; est_backup: boolean }
interface ProgForm { numero: string; libelle: string }

/* ─── Helpers visuels ───────────────────────────────────────── */

function Btn({
  onClick, disabled = false, variant = 'ghost', className = '', children,
}: {
  onClick: () => void; disabled?: boolean; variant?: 'ghost' | 'teal' | 'red' | 'outline';
  className?: string; children: React.ReactNode;
}) {
  const base = 'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = {
    ghost:   'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
    teal:    'bg-teal-600 text-white hover:bg-teal-700',
    red:     'text-red-500 hover:text-red-700 hover:bg-red-50',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${color}`}>{label}</span>;
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
      {action}
    </div>
  );
}

/* ─── Inline input ──────────────────────────────────────────── */

function InlineInput({
  value, onChange, placeholder = '', className = '', onKeyDown,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  className?: string; onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`border border-teal-400 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 ${className}`}
    />
  );
}

/* ─── Composant principal ────────────────────────────────────── */

export default function ReferentielsTab() {
  const { toast, showToast } = useToast();

  /* Sub-tab */
  const [subTab, setSubTab] = useState<ReferentielsSubTab>('centrifugation');

  /* ── Destinataires ── */
  const [laboratoires, setLaboratoires] = useState<LaboratoireDest[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [showAddLab, setShowAddLab] = useState(false);
  const [newLabNom, setNewLabNom] = useState('');
  const [newLabEmail, setNewLabEmail] = useState('');
  const [editingLabId, setEditingLabId] = useState<number | null>(null);
  const [editingLabNom, setEditingLabNom] = useState('');
  const [editingLabEmail, setEditingLabEmail] = useState('');

  const loadLaboratoires = useCallback(async () => {
    setLoadingLabs(true);
    try {
      const res = await fetch('/api/admin/laboratoires');
      const data = await res.json();
      setLaboratoires(data.laboratoires ?? []);
    } finally {
      setLoadingLabs(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'destinataires') loadLaboratoires();
  }, [subTab, loadLaboratoires]);

  async function handleAddLab() {
    if (!newLabNom.trim()) return;
    const res = await fetch('/api/admin/laboratoires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: newLabNom.trim(), email_reception: newLabEmail.trim() || undefined }),
    });
    if (res.ok) {
      setNewLabNom(''); setNewLabEmail(''); setShowAddLab(false);
      await loadLaboratoires();
      showToast('Destinataire ajouté');
    } else {
      const err = await res.json();
      showToast(err.error ?? 'Erreur', 'error');
    }
  }

  async function handleSaveLab(id: number) {
    if (!editingLabNom.trim()) return;
    const res = await fetch(`/api/admin/laboratoires/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: editingLabNom.trim(), email_reception: editingLabEmail.trim() || null }),
    });
    if (res.ok) {
      setEditingLabId(null);
      await loadLaboratoires();
      showToast('Destinataire modifié');
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function handleToggleLab(lab: LaboratoireDest) {
    const action = lab.actif ? 'désactiver' : 'réactiver';
    if (lab.actif && !confirm(`Désactiver "${lab.nom}" ?`)) return;
    const res = await fetch(`/api/admin/laboratoires/${lab.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !lab.actif }),
    });
    if (res.ok) {
      await loadLaboratoires();
      showToast(`"${lab.nom}" ${action === 'désactiver' ? 'désactivé' : 'réactivé'}`);
    } else {
      showToast('Erreur', 'error');
    }
  }

  /* Sites */
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
  const [editingSiteNom, setEditingSiteNom] = useState('');
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteNom, setNewSiteNom] = useState('');

  /* Centrifugeuses */
  const [centrifugeuses, setCentrifugeuses] = useState<Centrifugeuse[]>([]);
  const [selectedCentriId, setSelectedCentriId] = useState<number | null>(null);
  const [editingCentriId, setEditingCentriId] = useState<number | null>(null);
  const [editingCentri, setEditingCentri] = useState<CentriForm>({ nom: '', modele: '', est_backup: false });
  const [showAddCentri, setShowAddCentri] = useState(false);
  const [newCentri, setNewCentri] = useState<CentriForm>({ nom: '', modele: '', est_backup: false });
  const [loadingCentri, setLoadingCentri] = useState(false);

  /* Programmes */
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [editingProgId, setEditingProgId] = useState<number | null>(null);
  const [editingProg, setEditingProg] = useState<ProgForm>({ numero: '', libelle: '' });
  const [showAddProg, setShowAddProg] = useState(false);
  const [newProg, setNewProg] = useState<ProgForm>({ numero: '', libelle: '' });
  const [loadingProg, setLoadingProg] = useState(false);

  /* ── Loaders ── */

  const loadSites = useCallback(async () => {
    const res = await fetch('/api/admin/sites');
    const data = await res.json();
    setSites(data.sites ?? []);
  }, []);

  const loadCentrifugeuses = useCallback(async (siteId: number) => {
    setLoadingCentri(true);
    setSelectedCentriId(null);
    setProgrammes([]);
    try {
      const res = await fetch(`/api/admin/centrifugeuses?site_id=${siteId}`);
      const data = await res.json();
      setCentrifugeuses(data.centrifugeuses ?? []);
    } finally {
      setLoadingCentri(false);
    }
  }, []);

  const loadProgrammes = useCallback(async (centriId: number) => {
    setLoadingProg(true);
    try {
      const res = await fetch(`/api/admin/programmes?centri_id=${centriId}`);
      const data = await res.json();
      setProgrammes(data.programmes ?? []);
    } finally {
      setLoadingProg(false);
    }
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  useEffect(() => {
    if (selectedSiteId !== null) loadCentrifugeuses(selectedSiteId);
    else { setCentrifugeuses([]); setProgrammes([]); setSelectedCentriId(null); }
  }, [selectedSiteId, loadCentrifugeuses]);

  useEffect(() => {
    if (selectedCentriId !== null) loadProgrammes(selectedCentriId);
    else setProgrammes([]);
  }, [selectedCentriId, loadProgrammes]);

  /* ── Actions Sites ── */

  async function handleAddSite() {
    if (!newSiteNom.trim()) return;
    const res = await fetch('/api/admin/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: newSiteNom.trim() }),
    });
    if (res.ok) {
      setNewSiteNom(''); setShowAddSite(false);
      await loadSites();
      showToast('Site ajouté');
    } else {
      showToast('Erreur lors de l\'ajout du site', 'error');
    }
  }

  async function handleRenameSite(id: number) {
    if (!editingSiteNom.trim()) return;
    const res = await fetch(`/api/admin/sites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: editingSiteNom.trim() }),
    });
    if (res.ok) {
      setEditingSiteId(null); setEditingSiteNom('');
      await loadSites();
      showToast('Site renommé');
    } else {
      showToast('Erreur lors du renommage', 'error');
    }
  }

  async function handleDisableSite(site: Site) {
    if (!confirm(`Désactiver le site "${site.nom}" ? Les centrifugeuses de ce site ne seront plus disponibles.`)) return;
    const res = await fetch(`/api/admin/sites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: false }),
    });
    if (res.ok) {
      if (selectedSiteId === site.id) setSelectedSiteId(null);
      await loadSites();
      showToast(`Site "${site.nom}" désactivé`);
    } else {
      showToast('Erreur lors de la désactivation', 'error');
    }
  }

  async function handleEnableSite(site: Site) {
    const res = await fetch(`/api/admin/sites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: true }),
    });
    if (res.ok) { await loadSites(); showToast(`Site "${site.nom}" réactivé`); }
    else showToast('Erreur', 'error');
  }

  /* ── Actions Centrifugeuses ── */

  async function handleAddCentri() {
    if (!newCentri.nom.trim() || !newCentri.modele.trim() || selectedSiteId === null) return;
    const res = await fetch('/api/admin/centrifugeuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: selectedSiteId, ...newCentri, nom: newCentri.nom.trim(), modele: newCentri.modele.trim() }),
    });
    if (res.ok) {
      setNewCentri({ nom: '', modele: '', est_backup: false }); setShowAddCentri(false);
      await loadCentrifugeuses(selectedSiteId);
      showToast('Centrifugeuse ajoutée');
    } else {
      showToast('Erreur lors de l\'ajout', 'error');
    }
  }

  async function handleSaveCentri(id: number) {
    if (!editingCentri.nom.trim() || !editingCentri.modele.trim()) return;
    const res = await fetch(`/api/admin/centrifugeuses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: editingCentri.nom.trim(), modele: editingCentri.modele.trim(), est_backup: editingCentri.est_backup }),
    });
    if (res.ok) {
      setEditingCentriId(null);
      if (selectedSiteId) await loadCentrifugeuses(selectedSiteId);
      showToast('Centrifugeuse modifiée');
    } else {
      showToast('Erreur lors de la modification', 'error');
    }
  }

  async function handleDisableCentri(c: Centrifugeuse) {
    if (!confirm(`Désactiver "${c.nom}" ? Elle ne sera plus disponible dans les sessions.`)) return;
    const res = await fetch(`/api/admin/centrifugeuses/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: false }),
    });
    if (res.ok) {
      if (selectedCentriId === c.id) setSelectedCentriId(null);
      if (selectedSiteId) await loadCentrifugeuses(selectedSiteId);
      showToast(`"${c.nom}" désactivée`);
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function handleEnableCentri(c: Centrifugeuse) {
    const res = await fetch(`/api/admin/centrifugeuses/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: true }),
    });
    if (res.ok) {
      if (selectedSiteId) await loadCentrifugeuses(selectedSiteId);
      showToast(`"${c.nom}" réactivée`);
    } else {
      showToast('Erreur', 'error');
    }
  }

  /* ── Actions Programmes ── */

  async function handleAddProg() {
    const num = parseInt(newProg.numero, 10);
    if (!newProg.libelle.trim() || isNaN(num) || selectedCentriId === null) return;
    const res = await fetch('/api/admin/programmes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ centrifugeuse_id: selectedCentriId, numero: num, libelle: newProg.libelle.trim() }),
    });
    if (res.ok) {
      setNewProg({ numero: '', libelle: '' }); setShowAddProg(false);
      await loadProgrammes(selectedCentriId);
      showToast('Programme ajouté');
    } else {
      showToast('Erreur lors de l\'ajout', 'error');
    }
  }

  async function handleSaveProg(id: number) {
    const num = parseInt(editingProg.numero, 10);
    if (!editingProg.libelle.trim() || isNaN(num)) return;
    const res = await fetch(`/api/admin/programmes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: num, libelle: editingProg.libelle.trim() }),
    });
    if (res.ok) {
      setEditingProgId(null);
      if (selectedCentriId) await loadProgrammes(selectedCentriId);
      showToast('Programme modifié');
    } else {
      showToast('Erreur lors de la modification', 'error');
    }
  }

  async function handleDeleteProg(p: Programme) {
    if (!confirm(`Supprimer le programme ${p.numero} — "${p.libelle}" ?`)) return;
    const res = await fetch(`/api/admin/programmes/${p.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      if (selectedCentriId) await loadProgrammes(selectedCentriId);
      showToast('Programme supprimé');
    } else {
      showToast(data.error ?? 'Erreur', 'error');
    }
  }

  /* ── Render ── */

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const selectedCentri = centrifugeuses.find((c) => c.id === selectedCentriId);

  return (
    <div className="flex flex-col h-full min-h-0 gap-0">
      <Toast toast={toast} />

      {/* ── Sub-tabs ── */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        {([
          { key: 'centrifugation', label: 'Centrifugation' },
          { key: 'destinataires', label: 'Destinataires transport' },
        ] as { key: ReferentielsSubTab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === tab.key
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Destinataires ── */}
      {subTab === 'destinataires' && (
        <div className="flex-1 flex flex-col min-h-0">
          <SectionHeader
            title="Laboratoires destinataires"
            action={
              <Btn variant="teal" onClick={() => { setShowAddLab(true); setEditingLabId(null); }}>
                + Ajouter
              </Btn>
            }
          />

          {showAddLab && (
            <div className="px-3 py-2 border-b border-teal-100 bg-teal-50 flex gap-2 items-end flex-wrap">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Nom</span>
                <InlineInput
                  value={newLabNom}
                  onChange={setNewLabNom}
                  placeholder="Nom du labo"
                  className="text-xs w-44"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddLab(); if (e.key === 'Escape') { setShowAddLab(false); setNewLabNom(''); setNewLabEmail(''); } }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">Email réception (optionnel)</span>
                <InlineInput
                  value={newLabEmail}
                  onChange={setNewLabEmail}
                  placeholder="email@labo.fr"
                  className="text-xs w-52"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddLab(); if (e.key === 'Escape') { setShowAddLab(false); setNewLabNom(''); setNewLabEmail(''); } }}
                />
              </div>
              <Btn variant="teal" onClick={handleAddLab} disabled={!newLabNom.trim()}>✓ Ajouter</Btn>
              <Btn variant="ghost" onClick={() => { setShowAddLab(false); setNewLabNom(''); setNewLabEmail(''); }}>Annuler</Btn>
            </div>
          )}

          {loadingLabs ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Chargement...</div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Nom</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Email réception</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Statut</th>
                    <th className="px-4 py-2 w-40" />
                  </tr>
                </thead>
                <tbody>
                  {laboratoires.length === 0 && !showAddLab && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">Aucun destinataire</td></tr>
                  )}
                  {laboratoires.map((lab) => (
                    <tr
                      key={lab.id}
                      className={`border-b border-gray-100 group hover:bg-gray-50 ${!lab.actif ? 'opacity-50' : ''}`}
                    >
                      {editingLabId === lab.id ? (
                        <>
                          <td className="px-3 py-1.5">
                            <InlineInput value={editingLabNom} onChange={setEditingLabNom} className="w-full" />
                          </td>
                          <td className="px-3 py-1.5">
                            <InlineInput value={editingLabEmail} onChange={setEditingLabEmail} placeholder="email@labo.fr" className="w-full" />
                          </td>
                          <td />
                          <td className="px-3 py-1.5 flex gap-1">
                            <Btn variant="teal" onClick={() => handleSaveLab(lab.id)} disabled={!editingLabNom.trim()}>✓</Btn>
                            <Btn variant="ghost" onClick={() => setEditingLabId(null)}>✕</Btn>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{lab.nom}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{lab.email_reception ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            {lab.actif
                              ? <Badge label="Actif" color="bg-teal-100 text-teal-700" />
                              : <Badge label="Inactif" color="bg-gray-100 text-gray-500" />
                            }
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 justify-end">
                              <Btn variant="ghost" onClick={() => { setEditingLabId(lab.id); setEditingLabNom(lab.nom); setEditingLabEmail(lab.email_reception ?? ''); }}>✎ Modifier</Btn>
                              {lab.actif
                                ? <Btn variant="red" onClick={() => handleToggleLab(lab)}>⊗ Désactiver</Btn>
                                : <Btn variant="ghost" onClick={() => handleToggleLab(lab)}>↺ Réactiver</Btn>
                              }
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Centrifugation ── */}
      {subTab === 'centrifugation' && (
      <div className="flex flex-1 min-h-0 gap-0">

      {/* ── Colonne Sites ── */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-0">
        <SectionHeader
          title="Sites"
          action={
            <Btn variant="teal" onClick={() => { setShowAddSite(true); setEditingSiteId(null); }}>
              + Ajouter
            </Btn>
          }
        />

        {showAddSite && (
          <div className="px-3 py-2 border-b border-teal-100 bg-teal-50 flex gap-1">
            <InlineInput
              value={newSiteNom}
              onChange={setNewSiteNom}
              placeholder="Nom du site"
              className="flex-1 text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSite(); if (e.key === 'Escape') { setShowAddSite(false); setNewSiteNom(''); } }}
            />
            <Btn variant="teal" onClick={handleAddSite} disabled={!newSiteNom.trim()}>✓</Btn>
            <Btn variant="ghost" onClick={() => { setShowAddSite(false); setNewSiteNom(''); }}>✕</Btn>
          </div>
        )}

        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {sites.map((site) => (
            <li key={site.id}>
              {editingSiteId === site.id ? (
                <div className="px-3 py-2 bg-teal-50 flex gap-1 items-center">
                  <InlineInput
                    value={editingSiteNom}
                    onChange={setEditingSiteNom}
                    className="flex-1 text-xs"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSite(site.id); if (e.key === 'Escape') setEditingSiteId(null); }}
                  />
                  <Btn variant="teal" onClick={() => handleRenameSite(site.id)}>✓</Btn>
                  <Btn variant="ghost" onClick={() => setEditingSiteId(null)}>✕</Btn>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer group transition-colors ${
                    selectedSiteId === site.id ? 'bg-teal-50 border-l-2 border-teal-500' : 'hover:bg-gray-50'
                  } ${!site.actif ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedSiteId(site.actif ? site.id : null)}
                >
                  <span className={`flex-1 text-sm font-medium ${selectedSiteId === site.id ? 'text-teal-800' : 'text-gray-700'}`}>
                    {site.nom}
                  </span>
                  {!site.actif && <Badge label="Inactif" color="bg-gray-100 text-gray-500" />}
                  <span className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
                    <Btn variant="ghost" onClick={() => { setEditingSiteId(site.id); setEditingSiteNom(site.nom); }}>✎</Btn>
                    {site.actif
                      ? <Btn variant="red" onClick={() => handleDisableSite(site)}>⊗</Btn>
                      : <Btn variant="ghost" onClick={() => handleEnableSite(site)}>↺</Btn>
                    }
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Panneau droit ── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">

        {/* ── Centrifugeuses ── */}
        <div className="flex flex-col min-h-0" style={{ flex: selectedCentriId !== null ? '0 0 55%' : '1' }}>
          <SectionHeader
            title={selectedSite ? `Centrifugeuses · ${selectedSite.nom}` : 'Centrifugeuses'}
            action={selectedSiteId !== null && (
              <Btn variant="teal" onClick={() => { setShowAddCentri(true); setEditingCentriId(null); }}>
                + Ajouter
              </Btn>
            )}
          />

          {selectedSiteId === null ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Sélectionner un site
            </div>
          ) : loadingCentri ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Chargement...</div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Nom</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Modèle</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Statut</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {showAddCentri && (
                    <tr className="border-b border-teal-100 bg-teal-50">
                      <td className="px-3 py-2">
                        <InlineInput value={newCentri.nom} onChange={(v) => setNewCentri((p) => ({ ...p, nom: v }))} placeholder="Nom" className="w-full" />
                      </td>
                      <td className="px-3 py-2">
                        <InlineInput value={newCentri.modele} onChange={(v) => setNewCentri((p) => ({ ...p, modele: v }))} placeholder="Modèle" className="w-full" />
                      </td>
                      <td className="px-3 py-2">
                        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                          <input type="checkbox" checked={newCentri.est_backup} onChange={(e) => setNewCentri((p) => ({ ...p, est_backup: e.target.checked }))} className="accent-teal-600" />
                          Backup
                        </label>
                      </td>
                      <td />
                      <td className="px-3 py-2 flex gap-1">
                        <Btn variant="teal" onClick={handleAddCentri} disabled={!newCentri.nom.trim() || !newCentri.modele.trim()}>✓ Ajouter</Btn>
                        <Btn variant="ghost" onClick={() => { setShowAddCentri(false); setNewCentri({ nom: '', modele: '', est_backup: false }); }}>Annuler</Btn>
                      </td>
                    </tr>
                  )}
                  {centrifugeuses.length === 0 && !showAddCentri && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">Aucune centrifugeuse</td></tr>
                  )}
                  {centrifugeuses.map((c) => (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-100 group transition-colors cursor-pointer ${
                        selectedCentriId === c.id ? 'bg-teal-50' : 'hover:bg-gray-50'
                      } ${!c.actif ? 'opacity-50' : ''}`}
                      onClick={() => setSelectedCentriId(c.actif && editingCentriId !== c.id ? c.id : selectedCentriId)}
                    >
                      {editingCentriId === c.id ? (
                        <>
                          <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                            <InlineInput value={editingCentri.nom} onChange={(v) => setEditingCentri((p) => ({ ...p, nom: v }))} className="w-full" />
                          </td>
                          <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                            <InlineInput value={editingCentri.modele} onChange={(v) => setEditingCentri((p) => ({ ...p, modele: v }))} className="w-full" />
                          </td>
                          <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                              <input type="checkbox" checked={editingCentri.est_backup} onChange={(e) => setEditingCentri((p) => ({ ...p, est_backup: e.target.checked }))} className="accent-teal-600" />
                              Backup
                            </label>
                          </td>
                          <td />
                          <td className="px-3 py-1.5 flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Btn variant="teal" onClick={() => handleSaveCentri(c.id)}>✓</Btn>
                            <Btn variant="ghost" onClick={() => setEditingCentriId(null)}>✕</Btn>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{c.nom}</td>
                          <td className="px-4 py-2.5 text-gray-500">{c.modele}</td>
                          <td className="px-4 py-2.5">
                            {c.est_backup
                              ? <Badge label="Backup" color="bg-amber-100 text-amber-700" />
                              : <Badge label="Principal" color="bg-teal-100 text-teal-700" />
                            }
                          </td>
                          <td className="px-4 py-2.5">
                            {!c.actif && <Badge label="Inactif" color="bg-gray-100 text-gray-500" />}
                          </td>
                          <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 justify-end">
                              <Btn variant="ghost" onClick={() => { setEditingCentriId(c.id); setEditingCentri({ nom: c.nom, modele: c.modele, est_backup: c.est_backup }); }}>✎ Modifier</Btn>
                              {c.actif
                                ? <Btn variant="red" onClick={() => handleDisableCentri(c)}>⊗ Désactiver</Btn>
                                : <Btn variant="ghost" onClick={() => handleEnableCentri(c)}>↺ Réactiver</Btn>
                              }
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Programmes ── */}
        {selectedCentriId !== null && (
          <div className="flex flex-col min-h-0 border-t-2 border-teal-200" style={{ flex: '1' }}>
            <SectionHeader
              title={selectedCentri ? `Programmes · ${selectedCentri.nom}` : 'Programmes'}
              action={
                <Btn variant="teal" onClick={() => { setShowAddProg(true); setEditingProgId(null); }}>
                  + Ajouter
                </Btn>
              }
            />

            {loadingProg ? (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Chargement...</div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 w-16">N°</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Libellé</th>
                      <th className="px-4 py-2 w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {showAddProg && (
                      <tr className="border-b border-teal-100 bg-teal-50">
                        <td className="px-3 py-1.5">
                          <InlineInput value={newProg.numero} onChange={(v) => setNewProg((p) => ({ ...p, numero: v }))} placeholder="N°" className="w-16" />
                        </td>
                        <td className="px-3 py-1.5">
                          <InlineInput value={newProg.libelle} onChange={(v) => setNewProg((p) => ({ ...p, libelle: v }))} placeholder="Libellé du programme" className="w-full" />
                        </td>
                        <td className="px-3 py-1.5 flex gap-1">
                          <Btn variant="teal" onClick={handleAddProg} disabled={!newProg.libelle.trim() || !newProg.numero}>✓ Ajouter</Btn>
                          <Btn variant="ghost" onClick={() => { setShowAddProg(false); setNewProg({ numero: '', libelle: '' }); }}>Annuler</Btn>
                        </td>
                      </tr>
                    )}
                    {programmes.length === 0 && !showAddProg && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">Aucun programme</td></tr>
                    )}
                    {programmes.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 group hover:bg-gray-50">
                        {editingProgId === p.id ? (
                          <>
                            <td className="px-3 py-1.5">
                              <InlineInput value={editingProg.numero} onChange={(v) => setEditingProg((prev) => ({ ...prev, numero: v }))} className="w-16" />
                            </td>
                            <td className="px-3 py-1.5">
                              <InlineInput value={editingProg.libelle} onChange={(v) => setEditingProg((prev) => ({ ...prev, libelle: v }))} className="w-full" />
                            </td>
                            <td className="px-3 py-1.5 flex gap-1">
                              <Btn variant="teal" onClick={() => handleSaveProg(p.id)}>✓</Btn>
                              <Btn variant="ghost" onClick={() => setEditingProgId(null)}>✕</Btn>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5">
                              <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs">{p.numero}</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">{p.libelle}</td>
                            <td className="px-3 py-2.5">
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1 justify-end">
                                <Btn variant="ghost" onClick={() => { setEditingProgId(p.id); setEditingProg({ numero: String(p.numero), libelle: p.libelle }); }}>✎ Modifier</Btn>
                                <Btn variant="red" onClick={() => handleDeleteProg(p)}>🗑 Supprimer</Btn>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
