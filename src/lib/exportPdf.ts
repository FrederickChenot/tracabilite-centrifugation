import type { HistoriqueSession } from '@/lib/schemas';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtDateTime(): string {
  return new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STOCKAGE_LABEL: Record<string, string> = {
  ambiant: 'Ambiant',
  '+5': '+5°C',
  '-20': '-20°C',
};

export async function exportTracabiliteJour(
  sessions: HistoriqueSession[],
  site: string,
  date: string,
  operateur?: string,
) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const marginL = 14;
  const marginR = 14;

  const totalTubes = sessions.reduce((acc, s) => acc + s.tubes.length, 0);
  const centris = [...new Set(sessions.map((s) => s.centri_nom).filter(Boolean))].join(', ');
  const operateurs = [...new Set(sessions.map((s) => s.visa))].join(', ');

  function addPageFooters() {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} / ${pageCount}  |  BioTools v1.0  |  Données certifiées`,
        pageW / 2,
        pageH - 6,
        { align: 'center' },
      );
    }
  }

  // En-tête page 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(14, 110, 86);
  doc.text('GCS Bio Med — CH Épinal', marginL, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Laboratoire de Biologie Médicale', marginL, 24);
  doc.text('Traçabilité Centrifugation', marginL, 29);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(`Date : ${fmtDateLong(date + 'T12:00:00')}`, marginL, 36);
  doc.text(`Site : ${site}`, marginL, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Généré le : ${fmtDateTime()}`, pageW - marginR, 36, { align: 'right' });
  if (operateur) {
    doc.text(`Opérateur : ${operateur}`, pageW - marginR, 41, { align: 'right' });
  }

  doc.setDrawColor(14, 110, 86);
  doc.setLineWidth(0.4);
  doc.line(marginL, 46, pageW - marginR, 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text('SCANS DU JOUR', marginL, 53);

  let startY = 57;

  for (const session of sessions) {
    const scanLine1 = [
      `Scan — ${session.centri_nom ?? ''}`,
      session.prog_numero ? `Pgm ${session.prog_numero}${session.prog_libelle ? ' ' + session.prog_libelle : ''}` : '',
      STOCKAGE_LABEL[session.stockage] ?? session.stockage,
      `Visa : ${session.visa}`,
    ]
      .filter(Boolean)
      .join('  ·  ');
    const scanLine2 = [
      `Ouvert à ${fmtTimeShort(session.opened_at)}${session.closed_at ? ` — Clôturé à ${fmtTimeShort(session.closed_at)}` : ' — En cours'}`,
      `${session.tubes.length} tube${session.tubes.length !== 1 ? 's' : ''}`,
    ].join('  ·  ');

    const body = session.tubes.map((tube, i) => [
      String(i + 1),
      tube.num_echant,
      fmtTime(tube.scanned_at),
      STOCKAGE_LABEL[session.stockage] ?? session.stockage,
      (tube as { remarque?: string }).remarque ?? '',
    ]);

    if (body.length === 0) {
      body.push(['—', '(aucun tube)', '', '', '']);
    }

    autoTable(doc, {
      startY,
      head: [
        [
          {
            content: scanLine1,
            colSpan: 5,
            styles: {
              fillColor: [230, 245, 240],
              textColor: [14, 110, 86],
              fontStyle: 'bold',
              fontSize: 8,
              cellPadding: { top: 3, bottom: 1, left: 3, right: 3 },
            },
          },
        ],
        [
          {
            content: scanLine2,
            colSpan: 5,
            styles: {
              fillColor: [230, 245, 240],
              textColor: [100, 100, 100],
              fontStyle: 'normal',
              fontSize: 7,
              cellPadding: { top: 1, bottom: 3, left: 3, right: 3 },
            },
          },
        ],
        ['N°', 'N° Échantillon', 'Heure scan', 'Stockage', 'Remarque'],
      ],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [245, 247, 250], textColor: [60, 60, 60], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 'auto' },
      },
      margin: { left: marginL, right: marginR },
      didDrawPage: () => {},
    });

    startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  // Résumé final
  const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? startY;
  const summaryY = lastY + 10;
  const needNewPage = summaryY > pageH - 40;
  if (needNewPage) doc.addPage();
  const sumY = needNewPage ? 20 : summaryY;

  doc.setDrawColor(14, 110, 86);
  doc.setLineWidth(0.3);
  doc.line(marginL, sumY - 2, pageW - marginR, sumY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(14, 110, 86);
  doc.text('RÉSUMÉ', marginL, sumY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  doc.text(`Total scans : ${sessions.length}`, marginL, sumY + 11);
  doc.text(`Total tubes : ${totalTubes}`, marginL, sumY + 17);
  doc.text(`Centrifugeuses utilisées : ${centris || '—'}`, marginL, sumY + 23);
  doc.text(`Opérateurs : ${operateurs || '—'}`, marginL, sumY + 29);

  addPageFooters();

  const safeSite = site.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
  doc.save(`tracabilite-centrifugation-${safeSite}-${date}.pdf`);
}
