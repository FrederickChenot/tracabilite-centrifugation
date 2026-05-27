# Templates emails Resend — BioLabTrack

Clé API : variable `RESEND_API_KEY` (préfixe "transport.")  
Domaine expéditeur : `noreply@biolabtrack.fr`

---

## Email 1 — Notification nouveau transport

**Destinataire :** email du labo destinataire (table `destinations.email_contact`)  
**Déclencheur :** création d'un bon de transport

```typescript
await resend.emails.send({
  from: 'BioLabTrack <noreply@biolabtrack.fr>',
  to: destination.email_contact,
  subject: `🚚 Transport #${bon.id.slice(0, 8).toUpperCase()} — ${bon.site_depart} → ${bon.destination_nom}`,
  html: `
    <!DOCTYPE html>
    <html lang="fr">
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #004785; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">BioLabTrack — Nouveau transport</h1>
        <p style="margin: 5px 0 0;">GCS Bio Med</p>
      </div>
      
      <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #004785;">Transport #${bon.id.slice(0, 8).toUpperCase()}</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; background: #f5f5f5; font-weight: bold; width: 40%;">Site de départ</td>
            <td style="padding: 8px;">${bon.site_depart}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Destination</td>
            <td style="padding: 8px;">${bon.destination_nom}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f5f5f5; font-weight: bold;">Date/heure</td>
            <td style="padding: 8px;">${new Date(bon.date_heure).toLocaleString('fr-FR')}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Opérateur</td>
            <td style="padding: 8px;">${bon.operateur}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f5f5f5; font-weight: bold;">Nombre de sachets</td>
            <td style="padding: 8px;">${bon.sachets.length}</td>
          </tr>
        </table>
        
        <div style="margin: 20px 0; text-align: center;">
          <a href="${confirmUrl}" 
             style="background: #004785; color: white; padding: 12px 24px; 
                    border-radius: 6px; text-decoration: none; font-size: 16px;">
            ✅ Confirmer la réception
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          Ou copiez ce lien : ${confirmUrl}
        </p>
      </div>
      
      <p style="color: #999; font-size: 11px; text-align: center; margin-top: 10px;">
        Email automatique — BioLabTrack — biolabtrack.fr
      </p>
    </body>
    </html>
  `,
});
```

---

## Email 2 — Confirmation réception (optionnel)

**Destinataire :** opérateur qui a créé le bon  
**Déclencheur :** confirmation par le destinataire

```typescript
await resend.emails.send({
  from: 'BioLabTrack <noreply@biolabtrack.fr>',
  to: operateur.email,
  subject: `✅ Transport #${bon.id.slice(0, 8).toUpperCase()} confirmé — ${bon.destination_nom}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2e7d32;">Transport confirmé ✅</h2>
      <p>Le transport <strong>#${bon.id.slice(0, 8).toUpperCase()}</strong> 
         vers <strong>${bon.destination_nom}</strong> a été confirmé.</p>
      <p>Confirmé par : <strong>${bon.confirme_par}</strong></p>
      <p>Le : <strong>${new Date(bon.confirme_le!).toLocaleString('fr-FR')}</strong></p>
    </div>
  `,
});
```

---

## Gestion des erreurs email

```typescript
try {
  const { error } = await resend.emails.send({ ... });
  if (error) {
    console.error('Erreur Resend:', error);
    // Ne pas bloquer le flux métier — logger seulement
  }
} catch (err) {
  console.error('Exception Resend:', err);
  // Idem — ne jamais faire échouer la création du bon à cause de l'email
}
```

> ⚠️ **Règle importante** : l'envoi d'email ne doit jamais bloquer la création  
> du bon de transport. Toujours wrapper dans try/catch et logger l'erreur.