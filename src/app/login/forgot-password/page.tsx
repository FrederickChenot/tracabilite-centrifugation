'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-teal-600 mb-3">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p className="text-sm text-gray-500 mt-1">Nous vous enverrons un lien de réinitialisation</p>
        </div>

        {done ? (
          <div className="text-center">
            <div className="mb-4 px-4 py-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800">
              Si cette adresse email est associée à un compte, vous recevrez un lien dans quelques minutes.
            </div>
            <Link href="/login" className="text-sm text-teal-600 hover:underline">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
            </button>
            <Link href="/login" className="text-center text-sm text-gray-500 hover:text-gray-700">
              Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
