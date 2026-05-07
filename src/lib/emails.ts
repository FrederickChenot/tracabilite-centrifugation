import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'BioTools <onboarding@resend.dev>';
const TO = process.env.EMAIL_EXPEDITEUR ?? '';

function bonNum(id: string) { return id.slice(0, 6).toUpperCase(); }

function baseUrl() {
  const url = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL ?? 'http://localhost:3000');
  return url;
}

function htmlEmail(title: string, tableRows: string, bonId: string, iconTitle: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0F6E56;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">GCS Bio Med — BioTools</h2>
        <p style="margin:6px 0 0;font-size:14px;opacity:0.85">${iconTitle}</p>
      </div>
      <div style="padding:20px;border:1px solid #e0e0e0;border-top:none;background:#fff">
        <h3 style="margin:0 0 16px;color:#1f2937;font-size:16px">${title}</h3>
        <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
          ${tableRows}
        </table>
        <a href="${baseUrl()}/transport/${bonId}"
           style="display:inline-block;background:#0F6E56;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
          Voir le bon de transport
        </a>
      </div>
      <div style="padding:12px 20px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb">
        BioTools — tracabilite-centrifugation.vercel.app
      </div>
    </div>
  `;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#666;font-size:13px;width:40%">${label}</td>
    <td style="padding:8px 0;font-weight:600;color:#111827">${value}</td>
  </tr>`;
}

export async function sendEmailPriseEnCharge(params: {
  id: string;
  dest_nom?: string;
  nom_transporteur: string;
  visa_transporteur: string;
  envoye_at: string;
  nb_ambiant: number;
  nb_plus4: number;
  nb_congele: number;
}) {
  const num = bonNum(params.id);
  const heure = new Date(params.envoye_at).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const tableRows = [
    row('Bon N°', num),
    row('Transporteur', `${params.nom_transporteur} (${params.visa_transporteur})`),
    row('Heure', heure),
    ...(params.dest_nom ? [row('Destination', params.dest_nom)] : []),
    row('Ambiant', `${params.nb_ambiant} sachet(s)`),
    row('+4°C', `${params.nb_plus4} sachet(s)`),
    row('Congelé', `${params.nb_congele} sachet(s)`),
  ].join('');

  try {
    await resend.emails.send({
      from: FROM,
      to: [TO],
      subject: `🚚 Bon N°${num} — Pris en charge par ${params.nom_transporteur}`,
      html: htmlEmail(
        `Bon N°${num} — Prise en charge`,
        tableRows,
        params.id,
        'Vos prélèvements ont été pris en charge',
      ),
    });
  } catch (err) {
    console.error('[emails] sendEmailPriseEnCharge error:', err);
  }
}

export async function sendEmailReception(params: {
  id: string;
  dest_nom: string;
  nom_receptionnaire: string;
  visa_receptionnaire: string;
  receptionne_at: string;
  nb_ambiant: number;
  nb_plus4: number;
  nb_congele: number;
}) {
  const num = bonNum(params.id);
  const heure = new Date(params.receptionne_at).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const tableRows = [
    row('Bon N°', num),
    row('Réceptionné par', `${params.nom_receptionnaire} (${params.visa_receptionnaire})`),
    row('Heure de réception', heure),
    row('Laboratoire', params.dest_nom),
    row('Ambiant', `${params.nb_ambiant} sachet(s)`),
    row('+4°C', `${params.nb_plus4} sachet(s)`),
    row('Congelé', `${params.nb_congele} sachet(s)`),
  ].join('');

  try {
    await resend.emails.send({
      from: FROM,
      to: [TO],
      subject: `✅ Bon N°${num} — Réceptionné à ${params.dest_nom}`,
      html: htmlEmail(
        `Bon N°${num} — Réception confirmée`,
        tableRows,
        params.id,
        'Vos prélèvements ont été réceptionnés',
      ),
    });
  } catch (err) {
    console.error('[emails] sendEmailReception error:', err);
  }
}
