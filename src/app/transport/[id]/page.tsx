'use client'
import type { CSSProperties, ReactNode } from 'react'
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

function getTempLabel(temp: string) {
  switch (temp) {
    case 'ambiant': return 'Ambiant (15-25°C)'
    case 'plus4':   return '+5°C (2-8°C)'
    case 'congele': return 'Congelé (≤-15°C)'
    default: return temp
  }
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
      <button onClick={() => onChange(Math.max(0, value - 1))} style={btnSmall}>−</button>
      <span style={{ width: 32, textAlign: 'center', fontWeight: 700 }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={btnSmall}>+</button>
      <span style={{ fontSize: 18, color: ok ? '#16a34a' : '#dc2626', width: 24, textAlign: 'center' }}>
        {ok ? '✓' : '✗'}
      </span>
      <span style={{ fontSize: 12, color: '#6b7280' }}>/{expected}</span>
    </div>
  )
}

const btnSmall: CSSProperties = {
  width: 44, height: 44, border: '1px solid #d1d5db',
  borderRadius: 4, background: '#f9fafb', cursor: 'pointer', fontSize: 16,
}

const teal = '#0F6E56'

export default function TransportPublicPage() {
  const { id } = useParams<{ id: string }>()
  const [envoi, setEnvoi] = useState<Envoi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [qrCode, setQrCode] = useState<string>('')

  // Prise en charge
  const [nomTransporteur, setNomTransporteur] = useState('')
  const [visaTransporteur, setVisaTransporteur] = useState('')
  const [countsT, setCountsT] = useState({ ambiant: 0, plus4: 0, congele: 0 })

  // Réception
  const [nomReceptionnaire, setNomReceptionnaire] = useState('')
  const [visaReceptionnaire, setVisaReceptionnaire] = useState('')
  const [countsR, setCountsR] = useState({ ambiant: 0, plus4: 0, congele: 0 })

  useEffect(() => {
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(window.location.href, { width: 120 })
        .then((url) => setQrCode(url))
        .catch(() => {})
    })
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/transport/envois/${id}`)
      if (!res.ok) throw new Error('Envoi introuvable')
      const json = await res.json()
      const data: Envoi = json.envoi
      setEnvoi(data)
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

  async function exportCompletedPdf() {
    if (!envoi) return
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.width
    const pageH = doc.internal.pageSize.height
    const mL = 14, mR = 14
    const num = bonNum

    // En-tête vert
    doc.setFillColor(15, 110, 86)
    doc.rect(mL, 10, pageW - mL - mR, 14, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text('GCS Bio Med', mL + 3, 19)
    doc.text(`BON N°${num} — Transport complété`, pageW - mR, 19, { align: 'right' })

    // Badge complété
    doc.setFillColor(220, 252, 231)
    doc.rect(mL, 26, pageW - mL - mR, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(22, 163, 74)
    doc.text('Transport complété ✓', pageW / 2, 31.5, { align: 'center' })

    // Infos
    autoTable(doc, {
      startY: 36,
      body: [
        ['Expéditeur', envoi.site_nom],
        ['Destinataire', envoi.dest_nom],
        ['Opérateur', envoi.visa_expediteur],
        ['Date création', fmt(envoi.created_at)],
      ],
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 45, textColor: [100, 100, 100] }, 1: { fontStyle: 'bold' } },
      margin: { left: mL, right: mR },
    })

    // Sachets
    let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

    const sachets = envoi.sachets
    const ambiant = sachets.filter(s => s.temperature === 'ambiant')
    const plus4   = sachets.filter(s => s.temperature === 'plus4')
    const congele = sachets.filter(s => s.temperature === 'congele')

    type CS = { fillColor: [number, number, number]; halign?: 'center' | 'left'; fontSize?: number; fontStyle?: 'bold' | 'normal' }
    type CD = { content: string; styles: CS }
    const body: CD[][] = [
      [
        { content: 'Ambiant (15-25°C)', styles: { fillColor: [255, 243, 224] } },
        { content: String(ambiant.length), styles: { fillColor: [255, 243, 224], halign: 'center' } },
        { content: ambiant.map(s => s.code_barre).join(', ') || '—', styles: { fillColor: [255, 243, 224], fontSize: 7 } },
      ],
      [
        { content: '+5°C (2-8°C)', styles: { fillColor: [227, 242, 253] } },
        { content: String(plus4.length), styles: { fillColor: [227, 242, 253], halign: 'center' } },
        { content: plus4.map(s => s.code_barre).join(', ') || '—', styles: { fillColor: [227, 242, 253], fontSize: 7 } },
      ],
      [
        { content: 'Congelé (≤-15°C)', styles: { fillColor: [237, 231, 246] } },
        { content: String(congele.length), styles: { fillColor: [237, 231, 246], halign: 'center' } },
        { content: congele.map(s => s.code_barre).join(', ') || '—', styles: { fillColor: [237, 231, 246], fontSize: 7 } },
      ],
      [
        { content: 'TOTAL', styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } },
        { content: String(sachets.length), styles: { fillColor: [240, 240, 240], halign: 'center', fontStyle: 'bold' } },
        { content: '', styles: { fillColor: [240, 240, 240] } },
      ],
    ]

    autoTable(doc, {
      startY: y,
      head: [['Température', 'Nb sachets', 'Codes-barres']],
      body,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 'auto' } },
      margin: { left: mL, right: mR },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

    // Section DÉPART
    if (y + 28 > pageH - 20) { doc.addPage(); y = 20 }
    doc.setDrawColor(13, 148, 136)
    doc.setLineWidth(0.3)
    doc.rect(mL, y, pageW - mL - mR, 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(13, 148, 136)
    doc.text('DÉPART — Prise en charge', mL + 3, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(60, 60, 60)
    doc.text(`Pris en charge par : ${envoi.nom_transporteur} (${envoi.visa_transporteur})`, mL + 3, y + 15)
    doc.text(`Le : ${fmt(envoi.envoye_at)}`, mL + 3, y + 22)
    y += 34

    // Section RÉCEPTION
    if (y + 28 > pageH - 20) { doc.addPage(); y = 20 }
    doc.rect(mL, y, pageW - mL - mR, 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(13, 148, 136)
    doc.text('RÉCEPTION — Laboratoire destinataire', mL + 3, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(60, 60, 60)
    doc.text(`Réceptionné par : ${envoi.nom_receptionnaire} (${envoi.visa_receptionnaire})`, mL + 3, y + 15)
    doc.text(`Le : ${fmt(envoi.receptionne_at)}`, mL + 3, y + 22)

    // Pied de page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`BioTools — biolabtrack.fr | Page ${i} / ${pageCount}`, pageW / 2, pageH - 6, { align: 'center' })
    }

    doc.save(`bon-transport-${num}-complet.pdf`)
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

  const allOkT = countsT.ambiant === nbAmbiant && countsT.plus4 === nbPlus4 && countsT.congele === nbCongele
  const canEnvoyer = allOkT && nomTransporteur.trim() && visaTransporteur.trim()

  const allOkR = countsR.ambiant === nbAmbiant && countsR.plus4 === nbPlus4 && countsR.congele === nbCongele
  const canReceptionner = allOkR && nomReceptionnaire.trim() && visaReceptionnaire.trim()

  return (
    <div style={pageStyle}>
      {/* EN-TÊTE avec QR code */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: teal, letterSpacing: 1 }}>GCS Bio Med</div>
          <div style={{ fontSize: 15, color: '#374151', marginTop: 2 }}>Bon de transport numérique</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>N° {bonNum}</div>
        </div>
        {qrCode && (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <img src={qrCode} width={80} height={80} alt="QR code" style={{ display: 'block' }} />
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>Scannez pour accéder au bon</div>
          </div>
        )}
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
            <tr><Td>{getTempLabel('ambiant')}</Td><Td>{nbAmbiant}</Td><Td style={{ fontSize: 11 }}>{codesFor('ambiant')}</Td></tr>
            <tr style={{ background: '#f9fafb' }}><Td>{getTempLabel('plus4')}</Td><Td>{nbPlus4}</Td><Td style={{ fontSize: 11 }}>{codesFor('plus4')}</Td></tr>
            <tr><Td>{getTempLabel('congele')}</Td><Td>{nbCongele}</Td><Td style={{ fontSize: 11 }}>{codesFor('congele')}</Td></tr>
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
          {nbAmbiant > 0 && <Counter label={getTempLabel('ambiant')} expected={nbAmbiant} value={countsT.ambiant} onChange={v => setCountsT(p => ({ ...p, ambiant: v }))} />}
          {nbPlus4 > 0 && <Counter label={getTempLabel('plus4')} expected={nbPlus4} value={countsT.plus4} onChange={v => setCountsT(p => ({ ...p, plus4: v }))} />}
          {nbCongele > 0 && <Counter label={getTempLabel('congele')} expected={nbCongele} value={countsT.congele} onChange={v => setCountsT(p => ({ ...p, congele: v }))} />}
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
          {nbAmbiant > 0 && <Counter label={getTempLabel('ambiant')} expected={nbAmbiant} value={countsR.ambiant} onChange={v => setCountsR(p => ({ ...p, ambiant: v }))} />}
          {nbPlus4 > 0 && <Counter label={getTempLabel('plus4')} expected={nbPlus4} value={countsR.plus4} onChange={v => setCountsR(p => ({ ...p, plus4: v }))} />}
          {nbCongele > 0 && <Counter label={getTempLabel('congele')} expected={nbCongele} value={countsR.congele} onChange={v => setCountsR(p => ({ ...p, congele: v }))} />}
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
            onClick={exportCompletedPdf}
            style={{ ...btnPrimary, marginTop: 20, background: '#6b7280' }}
          >
            Télécharger le PDF
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

function Th({ children }: { children?: ReactNode }) {
  return <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #d1d5db' }}>{children}</th>
}

function Td({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <td style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', ...style }}>{children}</td>
}

const pageStyle: CSSProperties = {
  maxWidth: 600,
  margin: '0 auto',
  padding: '20px 16px 40px',
  fontFamily: 'system-ui, sans-serif',
  background: '#fff',
  minHeight: '100vh',
}

const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: '16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const sectionTitle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: '#0F6E56',
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: '2px solid #d1fae5',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 16,
  boxSizing: 'border-box',
}

const btnPrimary: CSSProperties = {
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
