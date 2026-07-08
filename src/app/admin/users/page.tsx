'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Site {
  id: string | number;
  nom: string;
  actif: boolean;
}

type Role = 'technicien' | 'biologiste' | 'secretaire' | 'cadre' | 'assistante_qualite' | 'agent_transverse' | 'responsable_processus_info' | 'admin';

const ROLE_LABELS: Record<Role, string> = {
  technicien:                 'Technicien',
  biologiste:                 'Biologiste',
  secretaire:                 'Secrétaire',
  cadre:                      'Cadre',
  assistante_qualite:         'Assist. qualité',
  agent_transverse:           'Agent transverse',
  responsable_processus_info: 'Responsable processus informatique',
  admin:                      'Admin',
};

const ROLE_CLS: Record<Role, string> = {
  technicien:                 'bg-gray-100 text-gray-600',
  biologiste:                 'bg-purple-100 text-purple-700',
  secretaire:                 'bg-yellow-100 text-yellow-700',
  cadre:                      'bg-orange-100 text-orange-700',
  assistante_qualite:         'bg-pink-100 text-pink-700',
  agent_transverse:           'bg-gray-100 text-gray-500',
  responsable_processus_info: 'bg-cyan-100 text-cyan-700',
  admin:                      'bg-blue-100 text-blue-700',
};

interface User {
  id: number;
  email: string;
  matricule: string | null;
  nom: string | null;
  prenom: string | null;
  role: Role;
  actif: boolean;
  created_at: string;
  site_nom: string | null;
  site_id: string | number | null;
}

interface UserForm {
  prenom: string;
  nom: string;
  matricule: string;
  email: string;
  role: Role;
  site_id: string;
  password: string;
  actif: boolean;
}

const EMPTY_FORM: UserForm = {
  prenom: '',
  nom: '',
  matricule: '',
  email: '',
  role: 'technicien',
  site_id: '',
  password: '',
  actif: true,
};

function Avatar({ prenom, nom }: { prenom?: string | null; nom?: string | null }) {
  const initials = [prenom?.[0], nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  return (
    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0 select-none">
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_CLS[role as Role] ?? 'bg-gray-100 text-gray-600';
  const label = ROLE_LABELS[role as Role] ?? role;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  );
}

function StatusBadge({ actif }: { actif: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
    }`}>
      {actif ? 'Actif' : 'Inactif'}
    </span>
  );
}

function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  if (!message) return null;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
      type === 'error' ? 'bg-red-600' : 'bg-teal-700'
    }`}>
      {message}
    </div>
  );
}

function Modal({
  user,
  sites,
  onClose,
  onSaved,
}: {
  user: User | null;
  sites: Site[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isEdit = user !== null;
  const modalMode = isEdit ? 'edit' : 'create';
  const [form, setForm] = useState<UserForm>(
    isEdit
      ? {
          prenom: user.prenom ?? '',
          nom: user.nom ?? '',
          matricule: user.matricule ?? '',
          email: user.email,
          role: user.role,
          site_id: user.site_id !== null ? String(user.site_id) : '',
          password: '',
          actif: user.actif,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [erreurMdp, setErreurMdp] = useState('');

  async function save() {
    console.log('BOUTON CLIQUÉ');
    setError('');
    setErreurMdp('');

    if (!form.prenom || !form.nom || !form.email) {
      setError('Prénom, nom et email sont obligatoires');
      return;
    }

    if (modalMode === 'create' && !form.matricule.trim()) {
      setError('Le matricule est obligatoire');
      return;
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(form.email)) {
      setError('Email invalide');
      return;
    }

    const PWD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (modalMode === 'create' && !PWD_REGEX.test(form.password)) {
      setErreurMdp('8 caractères minimum, 1 majuscule et 1 chiffre requis');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prenom: form.prenom,
            nom: form.nom,
            matricule: form.matricule.trim() || null,
            email: form.email,
            role: form.role,
            site_id: form.site_id || null,
            actif: form.actif,
          }),
        });
        if (res.ok) {
          onSaved('Utilisateur mis à jour');
        } else {
          const data = await res.json();
          setError(data.error ?? 'Erreur lors de la modification');
        }
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prenom: form.prenom,
            nom: form.nom,
            matricule: form.matricule.trim() || null,
            email: form.email,
            password: form.password,
            role: form.role,
            site_id: form.site_id || null,
            actif: form.actif,
          }),
        });
        if (res.ok) {
          onSaved('Utilisateur créé');
        } else {
          const data = await res.json();
          setError(data.error ?? 'Erreur lors de la création');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const set = (field: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-900 mb-5">
          {isEdit ? `Modifier — ${user.prenom} ${user.nom}` : 'Nouvel utilisateur'}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
            <input
              type="text"
              value={form.prenom}
              onChange={set('prenom')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus={!isEdit}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              value={form.nom}
              onChange={set('nom')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Matricule {modalMode === 'create' ? '*' : ''}</label>
            <input
              type="text"
              value={form.matricule}
              onChange={(e) => { set('matricule')(e); setError(''); }}
              placeholder="Ex: D048323"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => { set('email')(e); setError(''); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="col-span-2">
            {error && <p className="text-red-600 text-xs -mt-1">{error}</p>}
          </div>

          {!isEdit && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe * (8+ car., 1 majuscule, 1 chiffre)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => { set('password')(e); setErreurMdp(''); }}
                autoComplete="new-password"
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
                  erreurMdp ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-teal-500'
                }`}
              />
              {erreurMdp && <p className="text-red-600 text-xs mt-1">{erreurMdp}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={form.role}
              onChange={set('role')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <optgroup label="Rôles métier">
                <option value="technicien">Technicien</option>
                <option value="biologiste">Biologiste</option>
                <option value="secretaire">Secrétaire</option>
                <option value="cadre">Cadre</option>
                <option value="assistante_qualite">Assistante qualité</option>
                <option value="agent_transverse">Agent transverse</option>
                <option value="responsable_processus_info">Responsable processus informatique</option>
              </optgroup>
              <optgroup label="Administration">
                <option value="admin">Admin</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Site</label>
            <select
              value={form.site_id}
              onChange={set('site_id')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Tous les sites</option>
              {sites.filter((s) => s.actif).map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, actif: !p.actif }))}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                form.actif ? 'bg-teal-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                form.actif ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
            <span className="text-sm text-gray-700">Compte actif</span>
          </div>
        </div>

        <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState<User | null | 'new'>('new' as never);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, sitesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/sites'),
      ]);
      const usersData = await usersRes.json();
      const sitesData = await sitesRes.json();
      setUsers(usersData.users ?? []);
      setSites(sitesData.sites ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleUser(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !user.actif }),
    });
    if (res.ok) {
      showToast(user.actif ? `${user.email} désactivé` : `${user.email} réactivé`);
      await loadData();
    } else {
      showToast('Erreur lors du changement de statut', 'error');
    }
  }

  async function resetPassword(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
    if (res.ok) {
      showToast(`Mot de passe temporaire envoyé à ${user.email}`);
    } else {
      showToast('Erreur lors de la réinitialisation', 'error');
    }
  }

  function openEdit(user: User) {
    setModalUser(user);
    setShowModal(true);
  }

  function openNew() {
    setModalUser(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
  }

  async function handleSaved(msg: string) {
    setShowModal(false);
    showToast(msg);
    await loadData();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && <Toast message={toast.msg} type={toast.type} />}
      {showModal && (
        <Modal
          user={modalUser as User | null}
          sites={sites}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Retour
        </Link>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Gestion des utilisateurs</h1>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
        >
          + Nouvel utilisateur
        </button>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-sm text-gray-400">
            Chargement...
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {users.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-400">Aucun utilisateur</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 w-10" />
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600">Nom</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600">Matricule</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600">Email</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600">Rôle</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600">Site</th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600">Statut</th>
                    <th className="py-2.5 px-4 w-64" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${!u.actif ? 'opacity-60' : ''}`}
                    >
                      <td className="py-2.5 px-4">
                        <Avatar prenom={u.prenom} nom={u.nom} />
                      </td>
                      <td className="py-2.5 px-4 font-medium text-gray-800">
                        {u.prenom ? `${u.prenom} ${u.nom ?? ''}`.trim() : (u.nom ?? '—')}
                      </td>
                      <td className="py-2.5 px-4 text-gray-700 font-mono text-xs font-semibold">{u.matricule ?? '—'}</td>
                      <td className="py-2.5 px-4 text-gray-500 font-mono text-xs">{u.email}</td>
                      <td className="py-2.5 px-4"><RoleBadge role={u.role} /></td>
                      <td className="py-2.5 px-4 text-gray-500 text-xs">{u.site_nom ?? '—'}</td>
                      <td className="py-2.5 px-4"><StatusBadge actif={u.actif} /></td>
                      <td className="py-2.5 px-4">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => openEdit(u)}
                            className="text-xs px-2.5 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors font-medium whitespace-nowrap"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => resetPassword(u)}
                            className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                          >
                            Réinit. MDP
                          </button>
                          <button
                            onClick={() => toggleUser(u)}
                            className={`text-xs px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
                              u.actif
                                ? 'text-red-600 hover:bg-red-50 border border-red-200'
                                : 'text-teal-600 hover:bg-teal-50 border border-teal-200'
                            }`}
                          >
                            {u.actif ? 'Désactiver' : 'Réactiver'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
