import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, email, etablissement, nb_sites, message } = body as {
      nom: string;
      email: string;
      etablissement: string;
      nb_sites?: string;
      message?: string;
    };

    if (!nom?.trim() || !email?.trim() || !etablissement?.trim()) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const to = process.env.EMAIL_EXPEDITEUR;
      if (to) {
        await resend.emails.send({
          from: 'BioLabTrack Contact <onboarding@resend.dev>',
          to: [to],
          subject: `BioLabTrack — Demande de contact : ${nom} (${etablissement})`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#0F6E56;color:white;padding:20px;border-radius:8px 8px 0 0">
                <h2 style="margin:0;font-size:18px">BioLabTrack — Demande de contact</h2>
              </div>
              <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;background:#fff">
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px 0;color:#666;width:40%">Nom</td><td style="font-weight:600">${nom}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Email</td><td style="font-weight:600">${email}</td></tr>
                  <tr><td style="padding:8px 0;color:#666">Établissement</td><td style="font-weight:600">${etablissement}</td></tr>
                  ${nb_sites ? `<tr><td style="padding:8px 0;color:#666">Nb sites</td><td>${nb_sites}</td></tr>` : ''}
                  ${message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Message</td><td style="white-space:pre-wrap">${message}</td></tr>` : ''}
                </table>
              </div>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[contact]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
