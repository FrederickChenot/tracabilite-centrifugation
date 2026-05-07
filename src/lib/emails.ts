import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'onboarding@resend.dev';
const TO = process.env.EMAIL_EXPEDITEUR ?? '';

function bonNum(id: string) { return id.slice(0, 6).toUpperCase(); }

function baseUrl() {
  const url = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL ?? 'http://localhost:3000');
  return url;
}

function htmlEmail(title: string, body: string, bonId: string): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0d9488;color:white;padding:16px 24px">
        <h1 style="margin:0;font-size:18px">GCS Bio Med — Transport Prélèvements</h1>
      </div>
      <div style="padding:24px;background:#f9fafb">
        <h2 style="color:#1f2937;font-size:16px">${title}</h2>
        ${body}
        <div style="margin-top:24px">
          <a href="${baseUrl()}/transport/${bonId}"
             style="background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">
            Voir le bon
          </a>
        </div>
      </div>
      <div style="padding:12px 24px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb">
        BioTools — tracabilite-centrifugation.vercel.app
      </div>
    </div>
  `;
}

export async function sendEmailPriseEnCharge(params: {
  id: string;
  nom_transporteur: string;
  visa_transporteur: string;
  envoye_at: string;
  nb_ambiant: number;
  nb_plus4: number;
  nb_congele: number;
}) {
  const num = bonNum(params.id);
  const body = `
    <p style="color:#374151">Vos prélèvements ont été pris en charge.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Transporteur</td>
          <td style="padding:6px 0;font-weight:600;color:#111827">${params.nom_transporteur} (${params.visa_transporteur})</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">Heure</td>
          <td style="font-weight:600;color:#111827">${new Date(params.envoye_at).toLocaleString('fr-FR')}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">Ambiant</td>
          <td style="font-weight:600;color:#111827">${params.nb_ambiant} sachet(s)</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">+4°C</td>
          <td style="font-weight:600;color:#111827">${params.nb_plus4} sachet(s)</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">Congelé</td>
          <td style="font-weight:600;color:#111827">${params.nb_congele} sachet(s)</td></tr>
    </table>
  `;
  await resend.emails.send({
    from: FROM,
    to: [TO],
    subject: `Bon N°${num} — Pris en charge par ${params.nom_transporteur}`,
    html: htmlEmail(`Bon N°${num} — Pris en charge`, body, params.id),
  });
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
  const body = `
    <p style="color:#374151">Vos prélèvements ont été réceptionnés.</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Réceptionné par</td>
          <td style="padding:6px 0;font-weight:600;color:#111827">${params.nom_receptionnaire} (${params.visa_receptionnaire})</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">Heure</td>
          <td style="font-weight:600;color:#111827">${new Date(params.receptionne_at).toLocaleString('fr-FR')}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">Destination</td>
          <td style="font-weight:600;color:#111827">${params.dest_nom}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">Ambiant</td>
          <td style="font-weight:600;color:#111827">${params.nb_ambiant} sachet(s)</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">+4°C</td>
          <td style="font-weight:600;color:#111827">${params.nb_plus4} sachet(s)</td></tr>
      <tr><td style="color:#6b7280;font-size:13px">Congelé</td>
          <td style="font-weight:600;color:#111827">${params.nb_congele} sachet(s)</td></tr>
    </table>
  `;
  await resend.emails.send({
    from: FROM,
    to: [TO],
    subject: `Bon N°${num} — Réceptionné à ${params.dest_nom}`,
    html: htmlEmail(`Bon N°${num} — Réceptionné`, body, params.id),
  });
}
