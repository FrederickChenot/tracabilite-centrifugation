'use client'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

type ExtUser = {
  id?: string
  name?: string | null
  email?: string | null
  nom?: string | null
  prenom?: string | null
  role?: string
  must_change_password?: boolean
}

export default function ProfilPage() {
  const { data: session } = useSession()
  const user = session?.user as ExtUser | undefined

  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const mustChange = user?.must_change_password === true

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPwd !== confirmPwd) { setError('Les mots de passe ne correspondent pas'); return }
    if (newPwd.length < 8) { setError('Minimum 8 caractères'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ancien_password: oldPwd, nouveau_password: newPwd }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setOldPwd(''); setNewPwd(''); setConfirmPwd('')
        if (mustChange) {
          setTimeout(() => signOut({ callbackUrl: '/login?changed=true' }), 2000)
        }
      } else {
        setError(data.error ?? 'Erreur')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/outils/centrifugation" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Retour
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-sm font-semibold text-gray-800">Mon profil</h1>
      </div>

      <div className="max-w-lg mx-auto p-6 space-y-6">

        {/* Alerte mot de passe temporaire */}
        {mustChange && !success && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
            <strong>Action requise :</strong> Veuillez changer votre mot de passe temporaire avant de continuer.
          </div>
        )}

        {/* Infos utilisateur */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Informations</h2>
          <dl className="space-y-3">
            {[
              { label: 'Prénom', value: user?.prenom ?? '—' },
              { label: 'Nom', value: user?.nom ?? '—' },
              { label: 'Email', value: user?.email ?? '—' },
              { label: 'Rôle', value: user?.role ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Changement mot de passe */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Changer mon mot de passe</h2>

          {success ? (
            <div className="text-center py-2">
              <p className="text-teal-700 font-semibold mb-1">Mot de passe modifié ✓</p>
              {mustChange && (
                <p className="text-sm text-gray-500">Reconnexion dans quelques secondes...</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { label: 'Ancien mot de passe', value: oldPwd, set: setOldPwd, show: showOld, setShow: setShowOld, autoComplete: 'current-password' },
                { label: 'Nouveau mot de passe', value: newPwd, set: setNewPwd, show: showNew, setShow: setShowNew, autoComplete: 'new-password' },
                { label: 'Confirmer le nouveau mot de passe', value: confirmPwd, set: setConfirmPwd, show: showConfirm, setShow: setShowConfirm, autoComplete: 'new-password' },
              ].map(({ label, value, set, show, setShow, autoComplete }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      required
                      autoComplete={autoComplete}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button type="button" onClick={() => setShow((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded">
                      <EyeIcon open={show} />
                    </button>
                  </div>
                  {label === 'Nouveau mot de passe' && (
                    <p className="mt-1 text-xs text-gray-400">Minimum 8 caractères</p>
                  )}
                </div>
              ))}
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50">
                {loading ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => signOut({ callbackUrl: '/login?disconnected=true' })}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}
