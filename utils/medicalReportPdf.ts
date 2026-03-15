import { jsPDF } from 'jspdf';

// Logo Padron Trainer (192x192 PNG, base64)
const ADO_LOGO_BASE64 = 'data:image/png;base64,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';

interface MedicalReportData {
  comments: string;
  doctor_notes?: string;
  doctor_video_url?: string;
  reviewed_at?: string;
  created_at: string;
}

interface PdfOptions {
  clientName: string;
  /** Override doctor name (e.g. from form). If not provided, parsed from comments */
  doctorName?: string;
  /** Override collegiate number. If not provided, parsed from comments */
  collegiateNumber?: string;
  /** Override date. If not provided, uses reviewed_at or created_at */
  reportDate?: Date;
}

export function parseDoctorInfo(comments: string): { doctorName: string; collegiateNumber: string } {
  let doctorName = '';
  let collegiateNumber = '';
  const nameMatch = comments.match(/Dr\/a\.\s*([^(]+?)(?:\s*\(Col\.\s*([^)]+)\))?(?:\s+para\b)/);
  if (nameMatch) {
    doctorName = nameMatch[1].trim();
    collegiateNumber = nameMatch[2]?.trim() || '';
  }
  return { doctorName, collegiateNumber };
}

export function parseClientNameFromComments(comments: string): string {
  const match = comments.match(/para\s+(.+?)\./);
  return match ? match[1].trim() : '';
}

export function parseSections(doctorNotes: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  if (!doctorNotes) return sections;

  const sectionMap: Record<string, string> = {
    'VALORACIÓN/DIAGNÓSTICO': 'Valoración / Diagnóstico',
    'RECOMENDACIONES': 'Recomendaciones',
    'MEDICACIÓN PROPUESTA': 'Medicación Propuesta',
    'NOTAS ADICIONALES': 'Notas Adicionales'
  };

  const parts = doctorNotes.split(/\*\*([^*]+):\*\*\n?/);
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim();
    const content = (parts[i + 1] || '').trim();
    if (content) {
      sections.push({ title: sectionMap[key] || key, content });
    }
  }
  return sections;
}

/**
 * Generates and downloads a medical report PDF.
 * Works for both endocrino view (from stored data) and create view (from form data).
 */
export function generateMedicalReportPdf(report: MedicalReportData, options: PdfOptions) {
  const parsed = parseDoctorInfo(report.comments);
  const doctorName = options.doctorName || parsed.doctorName || 'No especificado';
  const collegiateNumber = options.collegiateNumber || parsed.collegiateNumber;
  const clientName = options.clientName || 'Paciente';
  const reportDate = options.reportDate || new Date(report.reviewed_at || report.created_at);
  const sections = parseSections(report.doctor_notes || '');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 15;

  const addNewPageIfNeeded = (space: number) => {
    if (y + space > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      y = 20;
    }
  };

  // Header bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Logo + Title row
  try {
    doc.addImage(ADO_LOGO_BASE64, 'PNG', margin, y, 18, 18);
  } catch {
    // If logo fails, continue without it
  }

  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME MÉDICO', margin + 22, y + 8);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Padron Trainer', margin + 22, y + 14);
  y += 25;

  // Doctor info
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dr/Dra. ${doctorName}`, margin, y);
  if (collegiateNumber) {
    doc.setFont('helvetica', 'normal');
    y += 5;
    doc.text(`N\u00B0 Colegiado: ${collegiateNumber}`, margin, y);
  }
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${reportDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin, y, { align: 'right' });
  y += 10;

  // Line
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Patient info
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Paciente', margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${clientName}`, margin, y);
  y += 8;

  // Sections
  for (const section of sections) {
    addNewPageIfNeeded(25);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(section.title, margin + 3, y + 6);
    y += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(section.content, pageWidth - margin * 2);
    for (const line of lines) {
      addNewPageIfNeeded(6);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 5;
  }

  // If no parsed sections, show raw notes
  if (sections.length === 0 && report.doctor_notes) {
    addNewPageIfNeeded(25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(report.doctor_notes, pageWidth - margin * 2);
    for (const line of lines) {
      addNewPageIfNeeded(6);
      doc.text(line, margin, y);
      y += 5;
    }
  }

  // Video reference
  if (report.doctor_video_url) {
    addNewPageIfNeeded(15);
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text('Video explicativo adjunto (ver en portal del paciente)', margin, y);
    y += 10;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Este documento es un informe m\u00E9dico informativo de Padron Trainer.', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text('No sustituye una consulta presencial de urgencia.', pageWidth / 2, footerY + 9, { align: 'center' });

  // Signature
  if (doctorName) {
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    const sigY = footerY - 15;
    doc.text(`Dr/Dra. ${doctorName}`, margin, sigY);
    if (collegiateNumber) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Col. ${collegiateNumber}`, margin, sigY + 5);
    }
  }

  const safeName = clientName.replace(/\s+/g, '_');
  const dateStr = reportDate.toISOString().split('T')[0];
  doc.save(`Informe_Medico_${safeName}_${dateStr}.pdf`);
}
