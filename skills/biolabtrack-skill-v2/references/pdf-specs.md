# Spécifications PDF — BioLabTrack

---

## PDF COFRAC — Centrifugation

### Contenu obligatoire (exigences COFRAC)
1. En-tête : nom laboratoire + site + logo si disponible
2. Titre : "FICHE DE TRAÇABILITÉ CENTRIFUGATION"
3. Identifiant unique de session (UUID tronqué)
4. Date et heure exactes (format JJ/MM/AAAA HH:MM)
5. Nom de l'opérateur
6. Centrifugeuse : identifiant + nom
7. Programme : identifiant + paramètres (RPM, durée, température si applicable)
8. Liste complète des tubes (codes-barres)
9. Nombre total de tubes
10. Pied de page : "Document généré par BioLabTrack — biolabtrack.fr"
11. Numéro de page

### Format
- Orientation : Portrait, A4
- Lib : jsPDF + jsPDF-AutoTable
- Génération : côté client (évite les problèmes de rendu serveur)

### Template de génération
```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generatePDFCentrifugation(session: {
  id: string;
  site: string;
  centrifugeuse_id: string;
  programme_id: string;
  operateur: string;
  date_heure: string;
  tubes: string[];
}): void {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  
  // === EN-TÊTE ===
  doc.setFillColor(0, 71, 133); // Bleu médical
  doc.rect(0, 0, pageW, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE DE TRAÇABILITÉ CENTRIFUGATION', pageW / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`GCS Bio Med — ${session.site}`, pageW / 2, 24, { align: 'center' });
  doc.text(`Document N° ${session.id.slice(0, 8).toUpperCase()}`, pageW / 2, 31, { align: 'center' });
  
  // === INFORMATIONS SESSION ===
  doc.setTextColor(0, 0, 0);
  
  autoTable(doc, {
    startY: 45,
    head: [['Champ', 'Valeur']],
    body: [
      ['Date et heure', new Date(session.date_heure).toLocaleString('fr-FR')],
      ['Opérateur', session.operateur],
      ['Centrifugeuse', session.centrifugeuse_id],
      ['Programme', session.programme_id],
      ['Nombre de tubes', String(session.tubes.length)],
    ],
    headStyles: { fillColor: [0, 71, 133] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
  });
  
  // === LISTE DES TUBES ===
  const tubesY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Liste des tubes traités', 14, tubesY);
  
  autoTable(doc, {
    startY: tubesY + 5,
    head: [['N°', 'Code-barres tube']],
    body: session.tubes.map((tube, i) => [String(i + 1), tube]),
    headStyles: { fillColor: [0, 71, 133] },
    alternateRowStyles: { fillColor: [240, 245, 255] },
  });
  
  // === PIED DE PAGE ===
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `BioLabTrack — biolabtrack.fr | Page ${i}/${pageCount}`,
      pageW / 2, 290, { align: 'center' }
    );
  }
  
  // Téléchargement
  doc.save(`centrifugation_${session.id.slice(0, 8)}_${Date.now()}.pdf`);
}
```

---

## PDF Bon de transport

### Contenu obligatoire
1. En-tête : "BON DE TRANSPORT" + numéro
2. QR code (coin haut droit) → URL de confirmation publique
3. Site de départ + destination
4. Date/heure + opérateur
5. Tableau des sachets : ID sachet, zone température, nombre de tubes
6. Détail des tubes par sachet
7. Zone de signature destinataire (si imprimé)
8. Statut actuel (en_attente / confirmé / annulé)
9. Si confirmé : nom confirmateur + date

### Zones de température — couleurs
```
Ambiant → fond blanc / texte noir
+4°C    → fond bleu clair (#E3F2FD)
Congelé → fond bleu foncé (#1565C0) / texte blanc
```

### Template QR code
```typescript
import QRCode from 'qrcode';

const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/transport/${bon.id}?token=${bon.qr_token}`;
const qrDataUrl = await QRCode.toDataURL(confirmUrl, {
  width: 150,
  margin: 1,
  color: { dark: '#000000', light: '#FFFFFF' }
});
doc.addImage(qrDataUrl, 'PNG', pageW - 55, 10, 45, 45);
```