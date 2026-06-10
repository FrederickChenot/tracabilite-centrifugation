'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import Sidebar from '@/components/layout/Sidebar';
import InactivityGuard from '@/components/InactivityGuard';
import MarkdownEditor from '@/components/tickets/MarkdownEditor';

/* ── Types ─────────────────────────────────────────────────────── */

type ChecklistItem = { id: string; texte: string; fait: boolean };

type PieceJointe = {
  id: string;
  nom: string;
  url: string;
  type: string;
  taille: number;
  uploaded_le: string;
  uploaded_par: string;
};

type Assigne = {
  user_id: number;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  assigne_le: string;
};

type Ticket = {
  id: string;
  titre: string;
  description: string | null;
  statut: string;
  priorite: string;
  cree_par: number;
  createur_prenom: string | null;
  createur_nom: string | null;
  site: string;
  motif_annulation: string | null;
  echeance: string | null;
  created_at: string;
  updated_at: string | null;
  assignes: Assigne[];
  checklist: ChecklistItem[] | null;
  pieces_jointes: PieceJointe[] | null;
};

type HistoriqueEntry = {
  id: string;
  ticket_id: string;
  user_id: number;
  action: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  commentaire: string | null;
  created_at: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
};

type User = {
  id: number;
  nom: string | null;
  prenom: string | null;
  email: string;
  role: string;
  actif: boolean;
};

type ExtUser = {
  id?: string;
  role?: string;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
};

/* ── Constants ─────────────────────────────────────────────────── */

const STATUTS_EDIT = [
  { id: 'a_faire',  label: 'À faire' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'termine',  label: 'Terminé' },
];

const PRIORITES = [
  { id: 'basse',   label: 'Basse' },
  { id: 'normale', label: 'Normale' },
  { id: 'haute',   label: 'Haute' },
  { id: 'urgente', label: 'Urgente' },
];

const STATUT_LABELS: Record<string, string> = {
  a_faire:  'À faire',
  en_cours: 'En cours',
  termine:  'Terminé',
  annule:   'Annulé',
};

const STATUT_BADGE: Record<string, string> = {
  a_faire:  'bg-gray-100 text-gray-700',
  en_cours: 'bg-blue-100 text-blue-700',
  termine:  'bg-green-100 text-green-700',
  annule:   'bg-red-100 text-red-700',
};

const PRIORITE_BADGE: Record<string, string> = {
  basse:   'bg-gray-100 text-gray-600 border border-gray-200',
  normale: 'bg-blue-100 text-blue-700 border border-blue-200',
  haute:   'bg-orange-100 text-orange-700 border border-orange-200',
  urgente: 'bg-red-100 text-red-700 border border-red-200',
};

const SITE_LABELS: Record<string, string> = {
  epinal:      'Épinal',
  remiremont:  'Remiremont',
  neufchateau: 'Neufchâteau',
};

const ACTION_CONFIG: Record<string, { label: string; icon: string; iconCls: string }> = {
  creation:             { label: 'Ticket créé',         icon: '●', iconCls: 'text-green-500' },
  changement_statut:    { label: 'Statut modifié',      icon: '⇄', iconCls: 'text-blue-500' },
  changement_priorite:  { label: 'Priorité modifiée',   icon: '↕', iconCls: 'text-orange-500' },
  changement_echeance:  { label: 'Échéance modifiée',   icon: '📅', iconCls: 'text-purple-500' },
  assignation:          { label: 'Utilisateur assigné', icon: '+', iconCls: 'text-teal-500 font-bold' },
  desassignation:       { label: 'Utilisateur retiré',  icon: '−', iconCls: 'text-gray-400 font-bold' },
  commentaire:          { label: 'Commentaire',         icon: '◎', iconCls: 'text-indigo-500' },
  annulation:           { label: 'Ticket annulé',       icon: '✕', iconCls: 'text-red-500' },
  piece_jointe:         { label: 'Pièce jointe',         icon: '📎', iconCls: 'text-gray-500' },
};

/* ── Helpers ───────────────────────────────────────────────────── */

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function initials(prenom: string | null, nom: string | null): string {
  const p = (prenom ?? '').charAt(0).toUpperCase();
  const n = (nom ?? '').charAt(0).toUpperCase();
  return (p + n) || '?';
}

function echeanceCls(echeance: string | null): string {
  if (!echeance) return '';
  const [y, m, d] = echeance.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0)  return 'text-red-600 font-semibold';
  if (diffDays <= 2) return 'text-orange-600 font-semibold';
  return 'text-gray-700';
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function isImage(type: string, nom: string): boolean {
  return type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(nom);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#+\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*+]\s/gm, '• ')
    .replace(/`(.+?)`/g, '$1')
    .replace(/---+/g, '──────────')
    .trim();
}

/* ── PDF Export ─────────────────────────────────────────────────── */

async function exportTicketPDF(ticket: Ticket, historique: HistoriqueEntry[], piecesJointes: PieceJointe[] = []) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;

  const BLUE = '#004785';
  const BLUE_RGB: [number, number, number] = [0, 71, 133];

  // En-tête bleu
  doc.setFillColor(...BLUE_RGB);
  doc.rect(0, 0, pageW, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BioLabTrack — GCS Bio Med', margin, 14);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, pageW - margin, 14, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TICKET #${ticket.id.slice(0, 8).toUpperCase()}`, margin, 27);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const shortTitle = ticket.titre.length > 80 ? ticket.titre.slice(0, 77) + '...' : ticket.titre;
  doc.text(shortTitle, margin, 36);

  doc.setTextColor(0, 0, 0);
  let y = 52;

  // Titre
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titreLines = doc.splitTextToSize(ticket.titre, pageW - margin * 2) as string[];
  doc.text(titreLines, margin, y);
  y += titreLines.length * 7 + 6;

  // Bandeau infos
  const STATUT_LABELS_PDF: Record<string, string> = {
    a_faire: 'À faire', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé',
  };
  const PRIO_LABELS_PDF: Record<string, string> = {
    basse: 'Basse', normale: 'Normale', haute: 'Haute', urgente: 'Urgente',
  };

  const createur = `${ticket.createur_prenom ?? ''} ${ticket.createur_nom ?? ''}`.trim() || '—';

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [],
    body: [
      ['Statut',    STATUT_LABELS_PDF[ticket.statut] ?? ticket.statut,
       'Priorité',  PRIO_LABELS_PDF[ticket.priorite] ?? ticket.priorite],
      ['Site',      SITE_LABELS[ticket.site] ?? ticket.site,
       'Créé par',  createur],
      ['Créé le',   fmtDate(ticket.created_at),
       'Échéance',  ticket.echeance ? fmtDate(ticket.echeance) : '—'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, fillColor: [240, 245, 255] },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 28, fillColor: [240, 245, 255] },
      3: { cellWidth: 55 },
    },
    styles: { fontSize: 9, cellPadding: 3 },
    theme: 'grid',
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Description
  if (ticket.description) {
    if (y > pageH - 60) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE_RGB);
    doc.text('Description', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    const descLines = doc.splitTextToSize(
      stripMarkdown(ticket.description),
      pageW - margin * 2
    ) as string[];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(descLines, margin, y);
    y += descLines.length * 4.5 + 8;
  }

  // Motif annulation
  if (ticket.statut === 'annule' && ticket.motif_annulation) {
    if (y > pageH - 40) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 0, 0);
    doc.text("Motif d'annulation", margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
    const motifLines = doc.splitTextToSize(ticket.motif_annulation, pageW - margin * 2) as string[];
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(motifLines, margin, y);
    y += motifLines.length * 4.5 + 8;
  }

  // Checklist
  const checklist = ticket.checklist ?? [];
  if (checklist.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = margin; }
    const done  = checklist.filter((i) => i.fait).length;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE_RGB);
    doc.text(`Checklist (${done}/${checklist.length})`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [],
      body: checklist.map((item) => [item.fait ? '✓' : '☐', item.texte]),
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
      styles: { fontSize: 9, cellPadding: 2.5 },
      theme: 'plain',
      didParseCell: (data) => {
        const item = checklist[data.row.index];
        if (item?.fait) data.cell.styles.textColor = [100, 180, 100];
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Pièces jointes
  if (piecesJointes.length > 0) {
    if (y > pageH - 50) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE_RGB);
    doc.text(`Pièces jointes (${piecesJointes.length})`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Fichier', 'Taille', 'Ajouté par', 'Date']],
      body: piecesJointes.map((p) => [p.nom, fmtSize(p.taille), p.uploaded_par, fmtDate(p.uploaded_le)]),
      headStyles: { fillColor: BLUE_RGB, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
      },
      theme: 'striped',
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Historique
  const ACTION_LABELS: Record<string, string> = {
    creation:            'Création',
    changement_statut:   'Statut modifié',
    changement_priorite: 'Priorité modifiée',
    changement_echeance: 'Échéance modifiée',
    assignation:         'Utilisateur assigné',
    desassignation:      'Utilisateur retiré',
    commentaire:         'Commentaire',
    annulation:          'Annulation',
    piece_jointe:        'Pièce jointe ajoutée',
  };

  if (historique.length > 0) {
    if (y > pageH - 60) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLUE_RGB);
    doc.text('Historique', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Acteur', 'Action', 'Détail']],
      body: historique.map((h) => {
        const acteur = `${h.prenom ?? ''} ${h.nom ?? ''}`.trim() || (h.email ?? '');
        let detail = '';
        if (h.ancienne_valeur && h.nouvelle_valeur) detail = `${h.ancienne_valeur} → ${h.nouvelle_valeur}`;
        else if (h.commentaire) detail = h.commentaire.slice(0, 120);
        return [fmtDateTime(h.created_at), acteur, ACTION_LABELS[h.action] ?? h.action, detail];
      }),
      headStyles: { fillColor: BLUE_RGB, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 32 },
        2: { cellWidth: 36 },
        3: { cellWidth: 'auto' },
      },
      theme: 'striped',
    });
  }

  // Pied de page sur chaque page
  const pageCount = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `BioLabTrack — biolabtrack.fr — Généré le ${new Date().toLocaleString('fr-FR')} — Page ${i}/${pageCount}`,
      pageW / 2,
      pageH - 6,
      { align: 'center' }
    );
  }

  doc.save(`ticket-${ticket.id.slice(0, 8)}.pdf`);
}

/* ── Word Export ────────────────────────────────────────────────── */

async function exportTicketWord(ticket: Ticket, historique: HistoriqueEntry[], piecesJointes: PieceJointe[]) {
  const docx = await import('docx');
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, WidthType, Header, Footer, ShadingType,
  } = docx;

  const dateGen = new Date().toLocaleString('fr-FR');
  const ticketNum = ticket.id.slice(0, 8).toUpperCase();

  const STATUT_LBL: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' };
  const PRIO_LBL: Record<string, string>   = { basse: 'Basse', normale: 'Normale', haute: 'Haute', urgente: 'Urgente' };
  const SITE_LBL: Record<string, string>   = { epinal: 'Épinal', remiremont: 'Remiremont', neufchateau: 'Neufchâteau' };
  const ACT_LBL: Record<string, string>    = {
    creation: 'Création', changement_statut: 'Statut modifié', changement_priorite: 'Priorité modifiée',
    changement_echeance: 'Échéance modifiée', assignation: 'Assigné', desassignation: 'Retiré',
    commentaire: 'Commentaire', annulation: 'Annulation', piece_jointe: 'Pièce jointe',
  };

  const createur = `${ticket.createur_prenom ?? ''} ${ticket.createur_nom ?? ''}`.trim() || '—';
  const assignesStr = ticket.assignes.length > 0
    ? ticket.assignes.map((a) => `${a.prenom ?? ''} ${a.nom ?? ''}`.trim() || (a.email ?? '')).join(', ')
    : '—';

  const BLUE_FILL = '004785';

  function infoRow(label: string, value: string) {
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
          width: { size: 2500, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F0F5FF' },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
          width: { size: 5000, type: WidthType.DXA },
        }),
      ],
    });
  }

  function histHeaderCell(text: string) {
    return new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 16, color: 'FFFFFF' })] })],
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: BLUE_FILL },
    });
  }

  function histDataRow(date: string, auteur: string, action: string, detail: string) {
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: date, size: 16 })] })], width: { size: 1900, type: WidthType.DXA } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: auteur, size: 16 })] })], width: { size: 1800, type: WidthType.DXA } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: action, size: 16 })] })], width: { size: 2000, type: WidthType.DXA } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: detail, size: 16 })] })], width: { size: 1900, type: WidthType.DXA } }),
      ],
    });
  }

  const checklist = ticket.checklist ?? [];

  const children = [
    new Paragraph({
      text: ticket.titre,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 0, after: 200 },
    }),

    new Paragraph({ spacing: { before: 0, after: 80 } }),

    new Table({
      rows: [
        infoRow('Statut',    STATUT_LBL[ticket.statut] ?? ticket.statut),
        infoRow('Priorité',  PRIO_LBL[ticket.priorite] ?? ticket.priorite),
        infoRow('Site',      SITE_LBL[ticket.site] ?? ticket.site),
        infoRow('Créé par',  createur),
        infoRow('Échéance',  ticket.echeance ? fmtDate(ticket.echeance) : '—'),
        infoRow('Assignés',  assignesStr),
      ],
      width: { size: 7500, type: WidthType.DXA },
    }),

    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Description')], spacing: { before: 300, after: 100 } }),
    new Paragraph({
      children: [new TextRun({ text: ticket.description ? stripMarkdown(ticket.description) : '—', size: 20 })],
      spacing: { before: 0, after: 200 },
    }),

    ...(checklist.length > 0 ? [
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Checklist')], spacing: { before: 200, after: 100 } }),
      ...checklist.map((item) =>
        new Paragraph({
          children: [
            new TextRun({ text: item.fait ? '✓  ' : '☐  ', bold: true, color: item.fait ? '2E7D32' : '555555', size: 20 }),
            new TextRun({ text: item.texte, strike: item.fait, color: item.fait ? '888888' : '111827', size: 20 }),
          ],
          spacing: { before: 0, after: 80 },
        })
      ),
    ] : []),

    ...(piecesJointes.length > 0 ? [
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Pièces jointes')], spacing: { before: 200, after: 100 } }),
      ...piecesJointes.map((p) =>
        new Paragraph({
          children: [
            new TextRun({ text: `• ${p.nom}`, size: 20 }),
            new TextRun({ text: `  (${fmtSize(p.taille)} — ${p.uploaded_par})`, size: 18, color: '888888' }),
          ],
          spacing: { before: 0, after: 80 },
        })
      ),
    ] : []),

    ...(historique.length > 0 ? [
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Historique')], spacing: { before: 200, after: 100 } }),
      new Table({
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              histHeaderCell('Date'),
              histHeaderCell('Auteur'),
              histHeaderCell('Action'),
              histHeaderCell('Détail'),
            ],
          }),
          ...historique.map((h) => {
            const acteur = `${h.prenom ?? ''} ${h.nom ?? ''}`.trim() || (h.email ?? '');
            let detail = '';
            if (h.ancienne_valeur && h.nouvelle_valeur) detail = `${h.ancienne_valeur} → ${h.nouvelle_valeur}`;
            else if (h.commentaire) detail = h.commentaire.slice(0, 100);
            return histDataRow(fmtDateTime(h.created_at), acteur, ACT_LBL[h.action] ?? h.action, detail);
          }),
        ],
        width: { size: 7600, type: WidthType.DXA },
      }),
    ] : []),
  ];

  const doc = new Document({
    sections: [{
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'GCS Bio Med — BioLabTrack', bold: true, size: 20 }),
                new TextRun({ text: `  |  Ticket #${ticketNum}`, color: '555555', size: 20 }),
              ],
              alignment: AlignmentType.LEFT,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [new TextRun({ text: `biolabtrack.fr  |  Généré le ${dateGen}`, size: 16, color: '9CA3AF' })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket_${ticketNum}_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Page ───────────────────────────────────────────────────────── */

export default function TicketDetailPage() {
  const params  = useParams();
  const ticketId = params.id as string;
  const router  = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user as ExtUser | undefined;
  const isAdmin = currentUser?.role === 'admin';
  const currentUserName = `${currentUser?.prenom ?? ''} ${currentUser?.nom ?? ''}`.trim() || (currentUser?.email ?? '');

  const [siteId, setSiteId]       = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [ticket, setTicket]       = useState<Ticket | null>(null);
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sidebar modify
  const [statut, setStatut]         = useState('');
  const [priorite, setPriorite]     = useState('');
  const [echeance, setEcheance]     = useState('');
  const [saving, setSaving]         = useState(false);

  // Description inline edit
  const [editingDesc, setEditingDesc]   = useState(false);
  const [editDescVal, setEditDescVal]   = useState('');
  const [savingDesc, setSavingDesc]     = useState(false);

  // Checklist
  const [checklist, setChecklist]         = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem]             = useState('');
  const [savingChecklist, setSavingChecklist] = useState(false);

  // Assignés
  const [users, setUsers]                 = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [savingAssignes, setSavingAssignes] = useState(false);

  // Commentaire
  const [commentaire, setCommentaire]     = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Pièces jointes
  const [piecesJointes, setPiecesJointes]     = useState<PieceJointe[]>([]);
  const [uploadingFile, setUploadingFile]     = useState(false);
  const [deletingPieceId, setDeletingPieceId] = useState<string | null>(null);
  const [previewImage, setPreviewImage]       = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal annulation
  const [showAnnulerModal, setShowAnnulerModal] = useState(false);
  const [motifAnnulation, setMotifAnnulation]   = useState('');
  const [annuling, setAnnuling]                 = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /* Load ticket + historique */
  const loadTicket = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (res.status === 404) { router.push('/tickets'); return; }
      if (res.ok) {
        const data = await res.json();
        const t = data.ticket as Ticket;
        setTicket(t);
        setHistorique(data.historique ?? []);
        setStatut(t.statut);
        setPriorite(t.priorite);
        setEcheance(t.echeance ?? '');
        setChecklist((t.checklist as ChecklistItem[] | null) ?? []);
        setPiecesJointes((t.pieces_jointes as PieceJointe[] | null) ?? []);
        setSelectedUsers((t.assignes ?? []).map((a: Assigne) => a.user_id));
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        setFetchError(err.error ?? err.detail ?? `Erreur ${res.status}`);
      }
    } catch {
      setFetchError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [ticketId, router]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers((data.users ?? []).filter((u: User) => u.actif));
    }
  }, [isAdmin]);

  useEffect(() => {
    loadTicket();
    document.title = 'Ticket | BioLabTrack';
  }, [loadTicket]);

  useEffect(() => {
    if (ticket) document.title = `${ticket.titre} | BioLabTrack`;
  }, [ticket]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  /* Save statut / priorité / échéance */
  async function handleSaveChanges() {
    if (!ticket) return;
    const body: Record<string, string | null> = {};
    if (statut !== ticket.statut) body.statut = statut;
    if (priorite !== ticket.priorite) body.priorite = priorite;
    const echeanceVal = echeance || null;
    if (echeanceVal !== (ticket.echeance ?? null)) body.echeance = echeanceVal;
    if (Object.keys(body).length === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast('Modifications enregistrées');
        await loadTicket();
      } else {
        showToast('Erreur lors de la sauvegarde', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  /* Reopen */
  async function handleReopen() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'en_cours' }),
      });
      if (res.ok) {
        showToast('Ticket rouvert');
        await loadTicket();
      } else {
        showToast('Erreur', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  /* Save description */
  async function handleSaveDescription() {
    setSavingDesc(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescVal.trim() || null }),
      });
      if (res.ok) {
        showToast('Description enregistrée');
        setEditingDesc(false);
        await loadTicket();
      } else {
        showToast('Erreur', 'error');
      }
    } finally {
      setSavingDesc(false);
    }
  }

  /* Checklist */
  async function saveChecklist(list: ChecklistItem[]) {
    setSavingChecklist(true);
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: list }),
      });
    } finally {
      setSavingChecklist(false);
    }
  }

  function addChecklistItem() {
    if (!newItem.trim()) return;
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      texte: newItem.trim(),
      fait: false,
    };
    const next = [...checklist, item];
    setChecklist(next);
    setNewItem('');
    saveChecklist(next);
  }

  function toggleChecklistItem(id: string) {
    const next = checklist.map((i) => (i.id === id ? { ...i, fait: !i.fait } : i));
    setChecklist(next);
    saveChecklist(next);
  }

  function deleteChecklistItem(id: string) {
    const next = checklist.filter((i) => i.id !== id);
    setChecklist(next);
    saveChecklist(next);
  }

  /* Assignés */
  async function handleSaveAssignes() {
    setSavingAssignes(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assigner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedUsers }),
      });
      if (res.ok) {
        showToast('Assignés mis à jour');
        await loadTicket();
      } else {
        showToast('Erreur', 'error');
      }
    } finally {
      setSavingAssignes(false);
    }
  }

  /* Add comment */
  async function handleAddComment() {
    if (!commentaire.trim()) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/commenter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaire: commentaire.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setHistorique((prev) => [
          ...prev,
          {
            ...data.historique,
            nom: currentUser?.nom ?? null,
            prenom: currentUser?.prenom ?? null,
            email: currentUser?.email ?? null,
          },
        ]);
        setCommentaire('');
        showToast('Commentaire ajouté');
      } else {
        showToast("Erreur lors de l'ajout", 'error');
      }
    } finally {
      setAddingComment(false);
    }
  }

  /* Delete comment */
  async function handleDeleteComment(histId: string) {
    setDeletingCommentId(histId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/commenter/${histId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setHistorique((prev) => prev.filter((h) => h.id !== histId));
        showToast('Commentaire supprimé');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } finally {
      setDeletingCommentId(null);
    }
  }

  /* Pièces jointes */
  async function handleUploadFile(file: File) {
    if (file.size > 10 * 1024 * 1024) { showToast('Fichier trop volumineux (max 10 Mo)', 'error'); return; }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/tickets/${ticketId}/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json() as { pieceJointe: PieceJointe };
        setPiecesJointes((prev) => [...prev, data.pieceJointe]);
        showToast('Fichier ajouté');
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        showToast(err.error ?? "Erreur lors de l'upload", 'error');
      }
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleDeletePiece(pieceId: string) {
    setDeletingPieceId(pieceId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/upload?pieceId=${pieceId}`, { method: 'DELETE' });
      if (res.ok) {
        setPiecesJointes((prev) => prev.filter((p) => p.id !== pieceId));
        showToast('Fichier supprimé');
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } finally {
      setDeletingPieceId(null);
    }
  }

  /* Annuler ticket */
  async function handleAnnuler() {
    if (!motifAnnulation.trim()) return;
    setAnnuling(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/annuler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif: motifAnnulation.trim() }),
      });
      if (res.ok) {
        setShowAnnulerModal(false);
        setMotifAnnulation('');
        showToast('Ticket annulé');
        await loadTicket();
      } else {
        const data = await res.json();
        showToast(data.error ?? "Erreur lors de l'annulation", 'error');
      }
    } finally {
      setAnnuling(false);
    }
  }

  function toggleUser(uid: number) {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  /* Computed */
  const isAnnule = ticket?.statut === 'annule';
  const isTermine = ticket?.statut === 'termine';
  const canEdit  = !isAnnule;

  const sidebarHasChanges = ticket && (
    statut !== ticket.statut ||
    priorite !== ticket.priorite ||
    (echeance || null) !== (ticket.echeance ?? null)
  );

  const clDone  = checklist.filter((i) => i.fait).length;
  const clTotal = checklist.length;
  const clPct   = clTotal > 0 ? Math.round((clDone / clTotal) * 100) : 0;

  const comments = historique.filter((h) => h.action === 'commentaire');
  const activity = historique.filter((h) => h.action !== 'commentaire');

  const mdCls = `text-sm text-gray-700
    [&_strong]:font-bold [&_em]:italic
    [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
    [&_li]:mb-0.5 [&_p]:mb-2 [&_p:last-child]:mb-0
    [&_h1]:font-bold [&_h1]:text-base [&_h1]:mb-1
    [&_h2]:font-semibold [&_h2]:text-sm [&_h2]:mb-1
    [&_hr]:border-gray-200 [&_hr]:my-2`;

  /* ─────────── LOADING ─────────── */
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar siteId={1} onSiteChange={() => {}} mobileOpen={false} onMobileClose={() => {}} />
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          Chargement...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar siteId={1} onSiteChange={() => {}} mobileOpen={false} onMobileClose={() => {}} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <p className="text-sm font-semibold text-red-600">{fetchError ?? 'Ticket introuvable'}</p>
          <Link href="/tickets" className="text-sm text-teal-600 hover:underline">
            ← Retour aux tickets
          </Link>
        </div>
      </div>
    );
  }

  /* ─────────── RENDER ─────────── */
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <InactivityGuard />
      <Sidebar
        siteId={siteId}
        onSiteChange={setSiteId}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Modal annulation */}
      {showAnnulerModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAnnulerModal(false); }}
        >
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Annuler le ticket</h2>
              <p className="text-sm text-gray-500 mt-1">
                Cette action est irréversible. Les assignés seront notifiés.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Motif d&apos;annulation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motifAnnulation}
                  onChange={(e) => setMotifAnnulation(e.target.value)}
                  placeholder="Expliquez la raison de l'annulation..."
                  rows={3}
                  autoFocus
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAnnulerModal(false); setMotifAnnulation(''); }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fermer
                </button>
                <button
                  onClick={handleAnnuler}
                  disabled={!motifAnnulation.trim() || annuling}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {annuling ? 'Annulation...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale aperçu image */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-9 right-0 text-white hover:text-gray-300 text-sm font-medium"
            >
              Fermer ✕
            </button>
            <img
              src={previewImage}
              alt="Aperçu"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded text-gray-500 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/tickets" className="text-teal-600 hover:text-teal-700 text-sm font-medium shrink-0">
            ← Tickets
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm md:text-base font-bold text-gray-900 truncate flex-1 min-w-0">
            {ticket.titre}
          </h1>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
              STATUT_BADGE[ticket.statut] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {STATUT_LABELS[ticket.statut] ?? ticket.statut}
          </span>
          <button
            onClick={() => exportTicketPDF(ticket, historique, piecesJointes)}
            title="Exporter en PDF"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => exportTicketWord(ticket, historique, piecesJointes)}
            title="Exporter en Word"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Word</span>
          </button>
        </div>

        {/* Content — 2 colonnes */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="flex flex-col lg:flex-row gap-5 max-w-5xl mx-auto p-4 md:p-6">

            {/* ── MAIN CONTENT ── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Description */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Description
                  </h2>
                  {canEdit && !editingDesc && (
                    <button
                      onClick={() => { setEditingDesc(true); setEditDescVal(ticket.description ?? ''); }}
                      className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Modifier
                    </button>
                  )}
                </div>

                {editingDesc ? (
                  <div className="space-y-3">
                    <MarkdownEditor
                      value={editDescVal}
                      onChange={setEditDescVal}
                      placeholder="Description du ticket..."
                      rows={6}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDescription}
                        disabled={savingDesc}
                        className="px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40"
                      >
                        {savingDesc ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => setEditingDesc(false)}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : ticket.description ? (
                  <div className={`bg-gray-50 rounded-lg p-4 ${mdCls}`}>
                    <ReactMarkdown>{ticket.description}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Aucune description.</p>
                )}

                {isAnnule && ticket.motif_annulation && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-700 mb-0.5">Motif d&apos;annulation</p>
                    <p className="text-sm text-red-600">{ticket.motif_annulation}</p>
                  </div>
                )}
              </div>

              {/* Checklist */}
              {canEdit || clTotal > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Checklist
                    </h2>
                    {clTotal > 0 && (
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                        {clDone}/{clTotal}
                      </span>
                    )}
                    {savingChecklist && (
                      <span className="text-xs text-gray-400">Sauvegarde...</span>
                    )}
                  </div>

                  {clTotal > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                      <div
                        className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${clPct}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 mb-4">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => toggleChecklistItem(item.id)}
                          disabled={!canEdit}
                          className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            item.fait
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-gray-300 hover:border-teal-400'
                          } disabled:cursor-default`}
                          style={{ width: '18px', height: '18px' }}
                        >
                          {item.fait && (
                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span
                          className={`text-sm flex-1 ${
                            item.fait ? 'line-through text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {item.texte}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => deleteChecklistItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {canEdit && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                        placeholder="Ajouter un élément..."
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        onClick={addChecklistItem}
                        disabled={!newItem.trim()}
                        className="px-3 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Pièces jointes */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Pièces jointes
                  </h2>
                  {piecesJointes.length > 0 && (
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                      {piecesJointes.length}
                    </span>
                  )}
                </div>

                {canEdit && (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors mb-3"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-teal-400', 'bg-teal-50'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-teal-400', 'bg-teal-50'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-teal-400', 'bg-teal-50');
                      const file = e.dataTransfer.files[0];
                      if (file) handleUploadFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFile(file);
                        e.target.value = '';
                      }}
                    />
                    {uploadingFile ? (
                      <p className="text-sm text-teal-600">Chargement en cours...</p>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-7 h-7 mx-auto text-gray-400 mb-1.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <p className="text-sm text-gray-500">
                          Glisser un fichier ici ou <span className="text-teal-600 font-medium">parcourir</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Tous formats — max 10 Mo</p>
                      </>
                    )}
                  </div>
                )}

                {piecesJointes.length > 0 && (
                  <div className="space-y-1.5">
                    {piecesJointes.map((p) => {
                      const isImg  = isImage(p.type, p.nom);
                      const isPdf  = p.type === 'application/pdf' || p.nom.toLowerCase().endsWith('.pdf');
                      const isWord = p.type.includes('word') || /\.(doc|docx)$/i.test(p.nom);
                      const canDeletePiece = isAdmin || currentUserName === p.uploaded_par;
                      return (
                        <div key={p.id} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg group hover:bg-gray-100 transition-colors">
                          <div className="w-8 h-8 rounded flex items-center justify-center bg-white border border-gray-200 flex-shrink-0">
                            {isImg ? (
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            ) : isPdf ? (
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ) : isWord ? (
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => isImg
                                ? setPreviewImage(`/api/tickets/${ticketId}/files/${p.id}`)
                                : window.open(`/api/tickets/${ticketId}/files/${p.id}`, '_blank')
                              }
                              className="text-sm font-medium text-teal-700 hover:text-teal-900 truncate block text-left w-full"
                              title={p.nom}
                            >
                              {p.nom}
                            </button>
                            <p className="text-xs text-gray-400">{fmtSize(p.taille)} · {p.uploaded_par} · {fmtDate(p.uploaded_le)}</p>
                          </div>
                          {canDeletePiece && (
                            <button
                              onClick={() => handleDeletePiece(p.id)}
                              disabled={deletingPieceId === p.id}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all disabled:opacity-40 flex-shrink-0"
                              title="Supprimer"
                            >
                              {deletingPieceId === p.id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {piecesJointes.length === 0 && !canEdit && (
                  <p className="text-sm text-gray-400 italic">Aucune pièce jointe.</p>
                )}
              </div>

              {/* Commentaires */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                  Commentaires
                  {comments.length > 0 && (
                    <span className="ml-2 text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      {comments.length}
                    </span>
                  )}
                </h2>

                {/* Liste commentaires */}
                {comments.length > 0 && (
                  <div className="space-y-4 mb-5">
                    {comments.map((c) => {
                      const isOwn = c.email === currentUser?.email;
                      const nom = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() || (c.email ?? 'Inconnu');
                      return (
                        <div key={c.id} className="flex gap-3">
                          <span className="w-8 h-8 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-semibold flex-shrink-0">
                            {initials(c.prenom, c.nom)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-800">{nom}</span>
                              <span className="text-xs text-gray-400">{fmtDateTime(c.created_at)}</span>
                              {(isOwn || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  disabled={deletingCommentId === c.id}
                                  className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                >
                                  {deletingCommentId === c.id ? '...' : 'Supprimer'}
                                </button>
                              )}
                            </div>
                            <div className={`bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 ${mdCls}`}>
                              {c.commentaire ? (
                                <ReactMarkdown>{c.commentaire}</ReactMarkdown>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Ajouter commentaire */}
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Votre commentaire (markdown supporté)..."
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y mb-2"
                />
                <button
                  onClick={handleAddComment}
                  disabled={addingComment || !commentaire.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {addingComment ? 'Ajout...' : 'Commenter'}
                </button>
              </div>

              {/* Historique activité */}
              {activity.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
                    Activité
                  </h2>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                    <div className="space-y-4">
                      {activity.map((entry) => {
                        const cfg = ACTION_CONFIG[entry.action] ?? {
                          label: entry.action, icon: '·', iconCls: 'text-gray-400',
                        };
                        const acteur = `${entry.prenom ?? ''} ${entry.nom ?? ''}`.trim() || (entry.email ?? 'Inconnu');
                        return (
                          <div key={entry.id} className="flex gap-3 relative pl-8">
                            <div
                              className={`absolute left-2 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold z-10 ${cfg.iconCls}`}
                            >
                              {cfg.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-sm font-semibold text-gray-800">{acteur}</span>
                                <span className="text-xs text-gray-500">{cfg.label}</span>
                                <span className="text-xs text-gray-400 ml-auto">
                                  {fmtDateTime(entry.created_at)}
                                </span>
                              </div>
                              {entry.ancienne_valeur && entry.nouvelle_valeur && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  <span className="line-through text-gray-400">{entry.ancienne_valeur}</span>
                                  {' → '}
                                  <span className="font-medium text-gray-700">{entry.nouvelle_valeur}</span>
                                </p>
                              )}
                              {entry.commentaire && entry.action === 'creation' && (
                                <p className="text-xs text-gray-400 mt-0.5">{entry.commentaire}</p>
                              )}
                              {entry.commentaire && entry.action === 'annulation' && (
                                <div className="mt-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                  <p className="text-xs font-medium text-red-700 mb-0.5">Motif</p>
                                  <p className="text-sm text-red-600">{entry.commentaire}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── SIDEBAR ── */}
            <div className="w-full lg:w-72 shrink-0 space-y-4">

              {/* Modifier statut / priorité / échéance */}
              {!isAnnule && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modifier</h3>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Statut</label>
                    <select
                      value={statut}
                      onChange={(e) => setStatut(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {STATUTS_EDIT.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Priorité</label>
                    <select
                      value={priorite}
                      onChange={(e) => setPriorite(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {PRIORITES.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Échéance</label>
                    <input
                      type="date"
                      value={echeance}
                      onChange={(e) => setEcheance(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    onClick={handleSaveChanges}
                    disabled={saving || !sidebarHasChanges}
                    className="w-full px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>

                  {isTermine && (
                    <button
                      onClick={handleReopen}
                      disabled={saving}
                      className="w-full px-4 py-2 text-sm font-medium border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 disabled:opacity-40 transition-colors"
                    >
                      Rouvrir le ticket
                    </button>
                  )}
                </div>
              )}

              {/* Informations */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Informations</h3>

                <div className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm text-gray-700">{SITE_LABELS[ticket.site] ?? ticket.site}</span>
                </div>

                <div className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Créé par</p>
                    <p className="text-sm text-gray-700">
                      {`${ticket.createur_prenom ?? ''} ${ticket.createur_nom ?? ''}`.trim() || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-400">Créé le</p>
                    <p className="text-sm text-gray-700">{fmtDate(ticket.created_at)}</p>
                  </div>
                </div>

                {ticket.updated_at && (
                  <div className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-400">Modifié le</p>
                      <p className="text-sm text-gray-700">{fmtDateTime(ticket.updated_at)}</p>
                    </div>
                  </div>
                )}

                {ticket.echeance && (
                  <div className="flex items-start gap-2">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-400">Échéance</p>
                      <p className={`text-sm ${echeanceCls(ticket.echeance)}`}>
                        {fmtDate(ticket.echeance)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-400">Commentaires</p>
                    <p className="text-sm text-gray-700">{comments.length}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-400">Priorité</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${PRIORITE_BADGE[ticket.priorite] ?? 'bg-gray-100 text-gray-600'}`}>
                      {PRIORITES.find((p) => p.id === ticket.priorite)?.label ?? ticket.priorite}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignés */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Assignés</h3>

                {!isAdmin && (
                  ticket.assignes.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Aucun assigné</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {ticket.assignes.map((a) => (
                        <div key={a.user_id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-1 pr-3 py-1">
                          <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-semibold">
                            {initials(a.prenom, a.nom)}
                          </span>
                          <span className="text-sm text-gray-700">
                            {`${a.prenom ?? ''} ${a.nom ?? ''}`.trim() || (a.email ?? '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {isAdmin && users.length > 0 && (
                  <>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 mb-3">
                      {users.map((u) => {
                        const fullName = `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || u.email;
                        const checked = selectedUsers.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                              checked ? 'bg-teal-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUser(u.id)}
                              className="w-4 h-4 text-teal-600 rounded border-gray-300"
                            />
                            <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-semibold shrink-0">
                              {((u.prenom ?? '').charAt(0) + (u.nom ?? '').charAt(0)).toUpperCase() || '?'}
                            </span>
                            <span className="text-sm text-gray-700 flex-1 truncate">{fullName}</span>
                          </label>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleSaveAssignes}
                      disabled={savingAssignes}
                      className="w-full px-4 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40"
                    >
                      {savingAssignes ? 'Mise à jour...' : 'Mettre à jour'}
                    </button>
                  </>
                )}

                {isAdmin && users.length === 0 && (
                  <p className="text-sm text-gray-400 italic">Chargement...</p>
                )}
              </div>

              {/* Annuler — admin, discret, tout en bas */}
              {isAdmin && !isAnnule && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <button
                    onClick={() => setShowAnnulerModal(true)}
                    className="w-full px-3 py-2 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Annuler le ticket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
