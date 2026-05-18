'use client';

import { useState, useEffect, useCallback } from 'react';
import Toast, { useToast } from './Toast';

interface ConfigRow { cle: string; valeur: string; description: string }
interface SiteWithEmail {
  id: number;
  nom: string;
  actif: boolean;
  email_notifications?: string | null;
}
interface User {
  id: number;
  email: string;
  nom: string | null;
  prenom: string | null;
  site_nom: string | null;
  site_id: number | null;
  role: string;
  actif: boolean;
  created_at: string;
}
interface NewUserForm {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  site_id: string;
  role: 'technicien' | 'admin';
}

const EMPTY_FORM: NewUserForm = { email: '', password: '', nom: '', prenom: '', site_id: '', role: 'technicien' };

interface EditUserForm {
  nom: string;
  prenom: string;
  email: string;
  site_id: string;
  role: 'technicien' | 'admin';
  actif: boolean;
}

function EditUserModal({
  user,
  sites,
  onClose,
  onSaved,
}: {
  user: User;
  sites: SiteWithEmail[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditUserForm>({
    nom: user.nom ?? '',
    prenom: user.prenom ?? '',
    email: user.email,
    site_id: user.site_id ? String(user.site_id) : '',
    role: user.role as 'technicien' | 'admin',
    actif: user.actif,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!form.email) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom || null,
          prenom: form.prenom || null,
          email: form.email,
          site_id: form.site_id ? parseInt(form.site_id, 10) : null,
          role: form.role,
          actif: form.actif,
        }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Erreur');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-900 mb-4">Modifier l&apos;utilisateur</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
            <input
              type="text"
              value={form.prenom}
              onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Site</label>
            <select
              value={form.site_id}
              onChange={(e) => setForm((p) => ({ ...p, site_id: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Tous les sites</option>
              {sites.filter((s) => s.actif).map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as 'technicien' | 'admin' }))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="technicien">Technicien</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-actif"
              checked={form.actif}
              onChange={(e) => setForm((p) => ({ ...p, actif: e.target.checked }))}
              className="accent-teal-600 w-4 h-4"
            />
            <label htmlFor="edit-actif" className="text-sm text-gray-700 cursor-pointer">Compte actif</label>
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={save}
            disabled={saving || !form.email}
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

function UserTable({
  users,
  onEdit,
  onToggle,
  onReset,
}: {
  users: User[];
  onEdit: (u: User) => void;
  onToggle: (u: User) => void;
  onReset: (u: User) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {users.length === 0 ? (
        <p className="px-4 py-4 text-sm text-gray-400 text-center">Aucun utilisateur</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Prénom</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Nom</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Email</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Rôle</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Statut</th>
              <th className="py-2 px-4" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50 last:border-0 ${!u.actif ? 'opacity-60' : ''}`}>
                <td className="py-2.5 px-4 text-gray-700">{u.prenom ?? '—'}</td>
                <td className="py-2.5 px-4 font-medium text-gray-800">{u.nom ?? '—'}</td>
                <td className="py-2.5 px-4 text-gray-500 font-mono text-xs">{u.email}</td>
                <td className="py-2.5 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.actif ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {u.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => onEdit(u)}
                      className="text-xs px-2 py-1 rounded border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors whitespace-nowrap font-medium"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => onReset(u)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      Réinit. mdp
                    </button>
                    <button
                      onClick={() => onToggle(u)}
                      className={`text-xs px-2 py-1 rounded font-medium transition-colors whitespace-nowrap ${
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
  );
}

export default function ConfigTab() {
  const { toast, showToast } = useToast();

  /* ── Sécurité ── */
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [warningMinutes, setWarningMinutes] = useState(2);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  /* ── Emails par site ── */
  const [sites, setSites] = useState<SiteWithEmail[]>([]);
  const [siteEmails, setSiteEmails] = useState<Record<number, string>>({});
  const [savingEmail, setSavingEmail] = useState<number | null>(null);

  /* ── Utilisateurs ── */
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(EMPTY_FORM);
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      const configs: ConfigRow[] = data.configs ?? [];
      const timeout = configs.find((c) => c.cle === 'session_timeout_minutes');
      const warning = configs.find((c) => c.cle === 'session_warning_minutes');
      if (timeout) setTimeoutMinutes(parseInt(timeout.valeur, 10));
      if (warning) setWarningMinutes(parseInt(warning.valeur, 10));
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadSitesAndUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [sitesRes, usersRes] = await Promise.all([
        fetch('/api/admin/sites'),
        fetch('/api/admin/users'),
      ]);
      const sitesData = await sitesRes.json();
      const usersData = await usersRes.json();
      const loadedSites: SiteWithEmail[] = sitesData.sites ?? [];
      setSites(loadedSites);
      // Init email inputs from loaded sites
      const emailMap: Record<number, string> = {};
      loadedSites.forEach((s) => { emailMap[s.id] = s.email_notifications ?? ''; });
      setSiteEmails(emailMap);
      setUsers(usersData.users ?? []);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadSitesAndUsers();
  }, [loadConfig, loadSitesAndUsers]);

  async function saveConfig() {
    setConfigSaving(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/config/session_timeout_minutes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valeur: String(timeoutMinutes) }),
        }),
        fetch('/api/admin/config/session_warning_minutes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valeur: String(warningMinutes) }),
        }),
      ]);
      if (r1.ok && r2.ok) showToast('Configuration enregistrée');
      else showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setConfigSaving(false);
    }
  }

  async function saveSiteEmail(siteId: number) {
    setSavingEmail(siteId);
    try {
      const res = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_notifications: siteEmails[siteId] ?? '' }),
      });
      if (res.ok) showToast('Email enregistré');
      else showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSavingEmail(null);
    }
  }

  async function addUser() {
    if (!newUser.email || !newUser.password) return;
    setAddingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          nom: newUser.nom || null,
          prenom: newUser.prenom || null,
          site_id: newUser.site_id ? parseInt(newUser.site_id, 10) : null,
          role: newUser.role,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Utilisateur créé');
        setNewUser(EMPTY_FORM);
        setShowAddForm(false);
        await loadSitesAndUsers();
      } else {
        showToast(data.error ?? 'Erreur', 'error');
      }
    } finally {
      setAddingUser(false);
    }
  }

  async function toggleUser(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !user.actif }),
    });
    if (res.ok) {
      await loadSitesAndUsers();
      showToast(user.actif ? `${user.email} désactivé` : `${user.email} réactivé`);
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function resetPassword(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
    if (res.ok) {
      showToast(`Email de réinitialisation envoyé à ${user.email}`);
    } else {
      showToast('Erreur lors de la réinitialisation', 'error');
    }
  }

  const activeSites = sites.filter((s) => s.actif);

  return (
    <div className="h-full overflow-auto">
      <Toast toast={toast} />
      {editingUser && (
        <EditUserModal
          user={editingUser}
          sites={sites}
          onClose={() => setEditingUser(null)}
          onSaved={async () => {
            setEditingUser(null);
            await loadSitesAndUsers();
            showToast('Utilisateur mis à jour');
          }}
        />
      )}
      <div className="max-w-4xl mx-auto p-6 space-y-8">

        {/* ── Sécurité ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">Sécurité</h2>
          {configLoading ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Délai d&apos;inactivité (minutes)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={5} max={120} step={5}
                    value={timeoutMinutes}
                    onChange={(e) => setTimeoutMinutes(parseInt(e.target.value, 10))}
                    className="flex-1 accent-teal-600"
                  />
                  <input
                    type="number" min={5} max={120}
                    value={timeoutMinutes}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 5 && v <= 120) setTimeoutMinutes(v);
                    }}
                    className="w-20 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-500 shrink-0">min</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Entre 5 et 120 minutes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Délai d&apos;avertissement (minutes)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min={1} max={5} step={1}
                    value={warningMinutes}
                    onChange={(e) => setWarningMinutes(parseInt(e.target.value, 10))}
                    className="flex-1 accent-teal-600"
                  />
                  <input
                    type="number" min={1} max={5}
                    value={warningMinutes}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1 && v <= 5) setWarningMinutes(v);
                    }}
                    className="w-20 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-500 shrink-0">min</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">Entre 1 et 5 minutes</p>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={saveConfig}
                  disabled={configSaving}
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {configSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Emails par site ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">Emails de notification par site</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Site</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Email de notification</th>
                  <th className="py-2 px-4 w-32" />
                </tr>
              </thead>
              <tbody>
                {sites.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">Chargement...</td></tr>
                ) : (
                  sites.map((site) => (
                    <tr key={site.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 px-4 font-medium text-gray-800">
                        {site.nom}
                        {!site.actif && <span className="ml-2 text-xs text-gray-400">(inactif)</span>}
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="email"
                          value={siteEmails[site.id] ?? ''}
                          onChange={(e) => setSiteEmails((prev) => ({ ...prev, [site.id]: e.target.value }))}
                          placeholder="notifications@site.fr"
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <button
                          onClick={() => saveSiteEmail(site.id)}
                          disabled={savingEmail === site.id}
                          className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {savingEmail === site.id ? '...' : 'Enregistrer'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
              Cet email reçoit les notifications de prise en charge et réception pour ce site. Laissez vide pour utiliser la variable EMAIL_EXPEDITEUR.
            </p>
          </div>
        </section>

        {/* ── Gestion des utilisateurs ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">Gestion des utilisateurs</h2>

          {/* Formulaire d'ajout (partagé) */}
          {showAddForm && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-teal-800 mb-3">Nouvel utilisateur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser((p) => ({ ...p, prenom: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={newUser.nom}
                    onChange={(e) => setNewUser((p) => ({ ...p, nom: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                    autoFocus
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Site</label>
                  <select
                    value={newUser.site_id}
                    onChange={(e) => setNewUser((p) => ({ ...p, site_id: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Tous les sites</option>
                    {activeSites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rôle</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as 'technicien' | 'admin' }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="technicien">Technicien</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-teal-100">
                <button
                  onClick={addUser}
                  disabled={addingUser || !newUser.email || !newUser.password}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {addingUser ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewUser(EMPTY_FORM); }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {usersLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Chargement...</div>
          ) : (
            <div className="space-y-6">
              {/* Groupe par site */}
              {activeSites.map((site) => {
                const siteUsers = users.filter((u) => u.site_id === site.id);
                return (
                  <div key={site.id}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">{site.nom}</h3>
                      <button
                        onClick={() => {
                          setNewUser({ ...EMPTY_FORM, site_id: String(site.id) });
                          setShowAddForm(true);
                        }}
                        className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <UserTable users={siteUsers} onEdit={setEditingUser} onToggle={toggleUser} onReset={resetPassword} />
                  </div>
                );
              })}

              {/* Administrateurs / Sans site */}
              {(() => {
                const activeSiteIds = new Set(activeSites.map((s) => s.id));
                const noSiteUsers = users.filter((u) => !u.site_id || !activeSiteIds.has(u.site_id));
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Administrateurs / Sans site</h3>
                      <button
                        onClick={() => {
                          setNewUser({ ...EMPTY_FORM, role: 'admin' });
                          setShowAddForm(true);
                        }}
                        className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
                      >
                        + Ajouter
                      </button>
                    </div>
                    <UserTable users={noSiteUsers} onEdit={setEditingUser} onToggle={toggleUser} onReset={resetPassword} />
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
