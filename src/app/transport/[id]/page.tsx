'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Sachet = {
  id: string
  temperature: 'ambiant' | 'plus4' | 'congele'
  code_barre: string
  ordre: number
  created_at: string
}

type Envoi = {
  id: string
  statut: 'en_preparation' | 'valide' | 'envoye' | 'receptionne'
  site_nom: string
  dest_nom: string
  visa_expediteur: string
  created_at: string
  envoye_at: string | null
  receptionne_at: string | null
  nom_transporteur: string | null
  visa_transporteur: string | null
  nom_receptionnaire: string | null
  visa_receptionnaire: string | null
  sachets: Sachet[]
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function Counter({
  label, expected, value, onChange,
}: {
  label: string
  expected: number
  value: number
  onChange: (v: number) => void
}) {
  const ok = value === expected
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={{ flex: 1, fontSize: 14 }}>{label}</span>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        style={btnSmall}
      >−</button>
      <span style={{ width: 32, textAlign: 'center', fontWeight: 700 }}>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        style={btnSmall}
      >+</button>
      <span style={{ fontSize: 18, color: ok ? '#16a34a' : '#dc2626', width: 24, textAlign: 'center' }}>
        {ok ? '✓' : '✗'}
      </span>
      <span style={{ fontSize: 12, color: '#6b7280' }}>/{expected}</span>
    </div>
  )
}

const btnSmall: React.CSSProperties = {
  width: 28, height: 28, border: '1px solid #d1d5db',
  borderRadius: 4, background: '#f9fafb', cursor: 'pointer', fontSize: 16,
}

const teal = '#0F6E56'

export default function TransportPublicPage() {
  const { id } = useParams<{ id: string }>()
  const [envoi, setEnvoi] = useState<Envoi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Prise en charge
  const [nomTransporteur, setNomTransporteur] = useState('')
  const [visaTransporteur, setVisaTransporteur] = useState('')
  const [countAmbiantT, setCountAmbiantT] = useState(0)
  const [countPlus4T, setCountPlus4T] = useState(0)
  const [countCongeleT, setCountCongeleT] = useState(0)

  // Réception
  const [nomReceptionnaire, setNomReceptionnaire] = useState('')
  const [visaReceptionnaire, setVisaReceptionnaire] = useState('')
  const [countAmbiantR, setCountAmbiantR] = useState(0)
  const [countPlus4R, setCountPlus4R] = useState(0)
  const [countCongeleR, setCountCongeleR] = useState(0)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/transport/envois/${id}`)
      if (!res.ok) throw new Error('Envoi introuvable')
      const data: Envoi = await res.json()
      setEnvoi(data)
      const nb4 = data.sachets.filter(s => s.temperature === 'plus4').length
      const nbA = data.sachets.filter(s => s.temperature === 'ambiant').length
      const nbC = data.sachets.filter(s => s.temperature === 'congele').length
      setCountAmbiantT(nbA); setCountPlus4T(nb4); setCountCongeleT(nbC)
      setCountAmbiantR(nbA); setCountPlus4R(nb4); setCountCongeleR(nbC)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleEnvoyer() {
    if (!envoi) return
    setSubmitting(true)
    try {
      await fetch(`/api/transport/envois/${id}/envoyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom_transporteur: nomTransporteur, visa_transporteur: visaTransporteur }),
      })
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReceptionner() {
    if (!envoi) return
    setSubmitting(true)
    try {
      await fetch(`/api/transport/envois/${id}/receptionner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom_receptionnaire: nomReceptionnaire, visa_receptionnaire: visaReceptionnaire }),
      })
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={pageStyle}><p style={{ textAlign: 'center', color: '#6b7280' }}>Chargement…</p></div>
  if (error || !envoi) return <div style={pageStyle}><p style={{ textAlign: 'center', color: '#dc2626' }}>{error || 'Envoi introuvable'}</p></div>

  const sachets = envoi.sachets
  const nbAmbiant = sachets.filter(s => s.temperature === 'ambiant').length
  const nbPlus4 = sachets.filter(s => s.temperature === 'plus4').length
  const nbCongele = sachets.filter(s => s.temperature === 'congele').length
  const nbTotal = sachets.length

  const codesFor = (temp: Sachet['temperature']) =>
    sachets.filter(s => s.temperature === temp).map(s => s.code_barre).join(', ') || '—'

  const bonNum = envoi.id.replace(/-/g, '').slice(0, 6).toUpperCase()

  const allOkT = countAmbiantT === nbAmbiant && countPlus4T === nbPlus4 && countCongeleT === nbCongele
  const canEnvoyer = allOkT && nomTransporteur.trim() && visaTransporteur.trim()

  const allOkR = countAmbiantR === nbAmbiant && countPlus4R === nbPlus4 && countCongeleR === nbCongele
  const canReceptionner = allOkR && nomReceptionnaire.trim() && visaReceptionnaire.trim()

  return (
    <div style={pageStyle}>
      {/* EN-TÊTE */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: teal, letterSpacing: 1 }}>GCS Bio Med</div>
        <div style={{ fontSize: 15, color: '#374151', marginTop: 2 }}>Bon de transport numérique</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>N° {bonNum}</div>
      </div>

      <div style={card}>
        <Row label="Expéditeur" value={envoi.site_nom} />
        <Row label="Destinataire" value={envoi.dest_nom} />
        <Row label="Opérateur" value={envoi.visa_expediteur} />
        <Row label="Date création" value={fmt(envoi.created_at)} />
      </div>

      {/* TABLEAU SACHETS */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={sectionTitle}>Sachets</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0fdf4' }}>
              <Th>Température</Th><Th>Nb</Th><Th>Codes-barres</Th>
            </tr>
          </thead>
          <tbody>
            <tr><Td>Ambiant (15-25°C)</Td><Td>{nbAmbiant}</Td><Td style={{ fontSize: 11 }}>{codesFor('ambiant')}</Td></tr>
            <tr style={{ background: '#f9fafb' }}><Td>+4°C (2-8°C)</Td><Td>{nbPlus4}</Td><Td style={{ fontSize: 11 }}>{codesFor('plus4')}</Td></tr>
            <tr><Td>Congelé (≤-15°C)</Td><Td>{nbCongele}</Td><Td style={{ fontSize: 11 }}>{codesFor('congele')}</Td></tr>
            <tr style={{ background: '#f0fdf4', fontWeight: 700 }}><Td>TOTAL</Td><Td>{nbTotal}</Td><Td></Td></tr>
          </tbody>
        </table>
      </div>

      {/* PRISE EN CHARGE */}
      {envoi.statut === 'valide' && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={sectionTitle}>Confirmation prise en charge — Transporteur</div>
          <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
            Vérifiez le nombre de sachets pris en charge :
          </p>
          {nbAmbiant > 0 && <Counter label="Ambiant (15-25°C)" expected={nbAmbiant} value={countAmbiantT} onChange={setCountAmbiantT} />}
          {nbPlus4 > 0 && <Counter label="+4°C (2-8°C)" expected={nbPlus4} value={countPlus4T} onChange={setCountPlus4T} />}
          {nbCongele > 0 && <Counter label="Congelé (≤-15°C)" expected={nbCongele} value={countCongeleT} onChange={setCountCongeleT} />}
          <div style={{ marginTop: 16 }}>
            <input
              placeholder="Votre nom complet"
              value={nomTransporteur}
              onChange={e => setNomTransporteur(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Vos initiales"
              value={visaTransporteur}
              onChange={e => setVisaTransporteur(e.target.value)}
              maxLength={5}
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </div>
          <button
            disabled={!canEnvoyer || submitting}
            onClick={handleEnvoyer}
            style={{ ...btnPrimary, marginTop: 16, opacity: !canEnvoyer || submitting ? 0.5 : 1 }}
          >
            {submitting ? 'Envoi…' : 'Confirmer la prise en charge'}
          </button>
        </div>
      )}

      {/* RÉCEPTION */}
      {envoi.statut === 'envoye' && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={sectionTitle}>Confirmation réception — Laboratoire destinataire</div>
          <p style={{ fontSize: 13, color: '#374151', marginBottom: 12 }}>
            Vérifiez le nombre de sachets reçus :
          </p>
          {nbAmbiant > 0 && <Counter label="Ambiant (15-25°C)" expected={nbAmbiant} value={countAmbiantR} onChange={setCountAmbiantR} />}
          {nbPlus4 > 0 && <Counter label="+4°C (2-8°C)" expected={nbPlus4} value={countPlus4R} onChange={setCountPlus4R} />}
          {nbCongele > 0 && <Counter label="Congelé (≤-15°C)" expected={nbCongele} value={countCongeleR} onChange={setCountCongeleR} />}
          <div style={{ marginTop: 16 }}>
            <input
              placeholder="Nom du réceptionnaire"
              value={nomReceptionnaire}
              onChange={e => setNomReceptionnaire(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Initiales"
              value={visaReceptionnaire}
              onChange={e => setVisaReceptionnaire(e.target.value)}
              maxLength={5}
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </div>
          <button
            disabled={!canReceptionner || submitting}
            onClick={handleReceptionner}
            style={{ ...btnPrimary, marginTop: 16, opacity: !canReceptionner || submitting ? 0.5 : 1 }}
          >
            {submitting ? 'Envoi…' : 'Confirmer la réception'}
          </button>
        </div>
      )}

      {/* TRANSPORT COMPLÉTÉ */}
      {envoi.statut === 'receptionne' && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{
              background: '#dcfce7', color: '#16a34a',
              padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: 15,
            }}>✓ Transport complété</span>
          </div>
          <Row label="Pris en charge par" value={`${envoi.nom_transporteur} (${envoi.visa_transporteur})`} />
          <Row label="Le" value={fmt(envoi.envoye_at)} />
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
          <Row label="Réceptionné par" value={`${envoi.nom_receptionnaire} (${envoi.visa_receptionnaire})`} />
          <Row label="Le" value={fmt(envoi.receptionne_at)} />
          <button
            onClick={() => window.print()}
            style={{ ...btnPrimary, marginTop: 20, background: '#6b7280' }}
          >
            Imprimer
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #d1d5db' }}>{children}</th>
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', ...style }}>{children}</td>
}

const pageStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: '0 auto',
  padding: '20px 16px 40px',
  fontFamily: 'system-ui, sans-serif',
  background: '#fff',
  minHeight: '100vh',
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: '16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: '#0F6E56',
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: '2px solid #d1fae5',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: '#0F6E56',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
}