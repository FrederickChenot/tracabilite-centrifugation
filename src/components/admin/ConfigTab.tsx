'use client';

import { useState, useEffect, useCallback } from 'react';
import Toast, { useToast } from './Toast';

interface ConfigRow { cle: string; valeur: string; description: string }
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

export default function ConfigTab() {
  const { toast, showToast } = useToast();

  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [warningMinutes, setWarningMinutes] = useState(2);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(EMPTY_FORM);
  const [addingUser, setAddingUser] = useState(false);
  const [resetPwdResult, setResetPwdResult] = useState<{ userId: number; pass: string } | null>(null);

  const [sites, setSites] = useState<{ id: number; nom: string }[]>([]);

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

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users ?? []);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadUsers();
    fetch('/api/admin/sites')
      .then((r) => r.json())
      .then((d) => setSites((d.sites ?? []).filter((s: { actif: boolean }) => s.actif)));
  }, [loadConfig, loadUsers]);

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
        await loadUsers();
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
      await loadUsers();
      showToast(user.actif ? `${user.email} désactivé` : `${user.email} réactivé`);
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function resetPassword(user: User) {
    if (!confirm(`Réinitialiser le mot de passe de ${user.email} ?`)) return;
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setResetPwdResult({ userId: user.id, pass: data.tempPassword });
    } else {
      showToast('Erreur lors de la réinitialisation', 'error');
    }
  }

  return (
    <div className="h-full overflow-auto">
      <Toast toast={toast} />
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

        {/* ── Gestion des utilisateurs ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Gestion des utilisateurs</h2>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
            >
              + Ajouter un utilisateur
            </button>
          </div>

          {showAddForm && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
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
                    <option value="">Aucun</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
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

          {resetPwdResult && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 mb-1">Mot de passe temporaire — visible une seule fois</p>
                <code className="text-lg font-mono font-bold text-amber-900 tracking-widest">{resetPwdResult.pass}</code>
              </div>
              <button
                onClick={() => setResetPwdResult(null)}
                className="text-amber-600 hover:text-amber-800 text-xl leading-none mt-0.5"
              >
                ✕
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {usersLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">Chargement...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Aucun utilisateur</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Prénom</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Nom</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Email</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Site</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Rôle</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600">Statut</th>
                    <th className="py-2 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${!u.actif ? 'opacity-60' : ''}`}
                    >
                      <td className="py-2.5 px-4 text-gray-700">{u.prenom ?? '—'}</td>
                      <td className="py-2.5 px-4 font-medium text-gray-800">{u.nom ?? '—'}</td>
                      <td className="py-2.5 px-4 text-gray-500 font-mono text-xs">{u.email}</td>
                      <td className="py-2.5 px-4 text-gray-600">{u.site_nom ?? '—'}</td>
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
                            onClick={() => resetPassword(u)}
                            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                          >
                            Réinitialiser mdp
                          </button>
                          <button
                            onClick={() => toggleUser(u)}
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
        </section>
      </div>
    </div>
  );
}
