import type { EnvoiTransport } from '@/lib/schemas';

function bonNum(id: string) { return id.slice(0, 6).toUpperCase(); }

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function exportTransportPdf(envoi: EnvoiTransport) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const QRCode = await import('qrcode');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const mL = 14, mR = 14;
  const num = bonNum(envoi.id);

  // QR code
  const qrUrl = `${window.location.origin}/transport/${envoi.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 150, margin: 1 });

  // Header box
  doc.setFillColor(13, 148, 136);
  doc.rect(mL, 10, pageW - mL - mR, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('GCS Bio Med', mL + 3, 18);
  doc.text(`BON DE TRANSPORT N°${num}`, pageW - mR - 24, 18, { align: 'right' });

  // Sub-header
  doc.setFillColor(240, 253, 250);
  doc.rect(mL, 22, pageW - mL - mR, 22, 'F');
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.5);
  doc.rect(mL, 22, pageW - mL - mR, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  const dateStr = fmtDateTime(envoi.created_at);
  doc.text(`CH ${envoi.site_nom ?? '-'} - Laboratoire de Biologie Medicale`, mL + 3, 28);
  doc.text('Tel : 03 29 68 76 89', mL + 3, 33);
  doc.text('BON DE RECEPTION A RETOURNER : commandes.labo@ch-ed.fr', mL + 3, 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(13, 148, 136);
  doc.text(`Expediteur : CH ${envoi.site_nom ?? '-'}`, pageW / 2 + 5, 27);
  doc.text(`Destinataire : ${envoi.dest_nom ?? '-'}`, pageW / 2 + 5, 32);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(`Date : ${dateStr}`, pageW / 2 + 5, 37);
  doc.text(`Operateur : ${envoi.visa_expediteur}`, pageW / 2 + 5, 42);

  // QR code top right — 20x20mm pour ne pas chevaucher le titre
  doc.addImage(qrDataUrl, 'PNG', pageW - mR - 22, 10, 20, 20);

  // Sachets table
  const sachets = envoi.sachets ?? [];
  const ambiant = sachets.filter((s) => s.temperature === 'ambiant');
  const plus4   = sachets.filter((s) => s.temperature === '+4');
  const congele = sachets.filter((s) => s.temperature === 'congele');

  const rows = [
    { label: 'Ambiant (15-25°C)',  color: [255, 243, 224] as [number, number, number], items: ambiant },
    { label: '+4°C (2-8°C)',  color: [227, 242, 253] as [number, number, number], items: plus4   },
    { label: 'Congele (<= -15°C)', color: [237, 231, 246] as [number, number, number], items: congele },
  ];

  const tableBody = rows.map((r) => [
    { content: r.label, styles: { fillColor: r.color } },
    { content: String(r.items.length), styles: { fillColor: r.color, halign: 'center' as const } },
    { content: r.items.map((s) => s.code_barre).join(', ') || '-', styles: { fillColor: r.color, fontSize: 7 } },
  ]);
  tableBody.push([
    { content: 'TOTAL', styles: { fillColor: [240, 240, 240] as [number, number, number], fontStyle: 'bold' as const } },
    { content: String(sachets.length), styles: { fillColor: [240, 240, 240] as [number, number, number], halign: 'center' as const, fontStyle: 'bold' as const } },
    { content: '', styles: { fillColor: [240, 240, 240] as [number, number, number] } },
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['Temperature', 'Nb sachets', 'Codes-barres scannes']],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 'auto' } },
    margin: { left: mL, right: mR },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = afterTable + 10;

  // Section DEPART
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(mL, y, pageW - mL - mR, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(13, 148, 136);
  doc.text('DEPART - Prise en charge', mL + 3, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Date et heure de prise en charge : _________________________', mL + 3, y + 15);
  doc.text('Nom du transporteur : ___________________________________', mL + 3, y + 22);
  doc.text('Signature : _____________________________________________', mL + 3, y + 29);
  doc.text('[ ] Ambiant : ___   [ ] +4°C : ___   [ ] Congele : ___', mL + 3, y + 36);
  y += 50;

  // Section RECEPTION
  if (y + 42 > pageH - 20) { doc.addPage(); y = 20; }
  doc.rect(mL, y, pageW - mL - mR, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(13, 148, 136);
  doc.text('RECEPTION - Laboratoire destinataire', mL + 3, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Date et heure de reception : ____________________________', mL + 3, y + 15);
  doc.text('Nom du receptionneur : _________________________________', mL + 3, y + 22);
  doc.text('Signature : _____________________________________________', mL + 3, y + 29);
  doc.text('[ ] Ambiant : ___   [ ] +4°C : ___   [ ] Congele : ___', mL + 3, y + 36);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `BioTools v1.0 - tracabilite-centrifugation.vercel.app | Page ${i} / ${pageCount}`,
      pageW / 2, pageH - 6, { align: 'center' }
    );
  }

  doc.save(`bon-transport-${num}.pdf`);
}
