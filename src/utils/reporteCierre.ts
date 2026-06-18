import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DatosCierre {
  turnoId: number;
  cajeroNombre: string;
  apertura: string;
  cierre: string;
  fondoInicial: number;
  // Sistema
  sistemaEfectivo: number;
  sistemaDebito: number;
  sistemaCredito: number;
  sistemaTransferencia: number;
  sistemaCC: number;
  // Contado por cajero
  contadoEfectivo: number;
  contadoDebito: number;
  contadoCredito: number;
  contadoTransferencia: number;
  contadoCC: number;
  // Resultado
  diferencia: number;
}

export const generarPdfCierre = (d: DatosCierre) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const fecha = new Date();
  const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  // ── Encabezado ───────────────────────────────────────────────
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageW, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SUPERMARKET', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('SISTEMA DE GESTIÓN', 14, 18);

  doc.setFontSize(10);
  doc.text('CIERRE DE CAJA', pageW - 14, 12, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`Impreso: ${fechaStr} ${horaStr}`, pageW - 14, 18, { align: 'right' });

  // ── Datos del turno ──────────────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 33, pageW - 28, 30, 2, 2, 'F');

  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('CAJERO', 20, 41);
  doc.text('TURNO N°', 80, 41);
  doc.text('APERTURA', 120, 41);
  doc.text('CIERRE', 160, 41);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(d.cajeroNombre, 20, 49);
  doc.text(`#${d.turnoId}`, 80, 49);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(new Date(d.apertura).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), 120, 49);
  doc.text(new Date(d.cierre).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), 160, 49);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7.5);
  doc.text('FONDO INICIAL', 20, 57);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`$${d.fondoInicial.toLocaleString('es-AR')}`, 20, 64);

  // ── Tabla comparativa ────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text('DETALLE POR MEDIO DE PAGO', 14, 75);

  const totalSistema = d.sistemaEfectivo + d.sistemaDebito + d.sistemaCredito + d.sistemaTransferencia + d.sistemaCC;
  const totalContado = d.contadoEfectivo + d.contadoDebito + d.contadoCredito + d.contadoTransferencia + d.contadoCC;

  const filas = [
    ['Efectivo',       d.sistemaEfectivo,      d.contadoEfectivo],
    ['Tarjeta débito', d.sistemaDebito,         d.contadoDebito],
    ['Tarjeta crédito',d.sistemaCredito,        d.contadoCredito],
    ['Transferencia',  d.sistemaTransferencia,  d.contadoTransferencia],
    ['Cta. corriente', d.sistemaCC,             d.contadoCC],
  ].map(([label, sistema, contado]) => {
    const dif = (contado as number) - (sistema as number);
    return [
      label,
      `$${(sistema as number).toLocaleString('es-AR')}`,
      `$${(contado as number).toLocaleString('es-AR')}`,
      dif === 0 ? '—' : dif > 0 ? `+$${dif.toLocaleString('es-AR')}` : `-$${Math.abs(dif).toLocaleString('es-AR')}`,
    ];
  });

  autoTable(doc, {
    startY: 78,
    head: [['Medio de pago', 'Sistema', 'Contado', 'Diferencia']],
    body: filas,
    foot: [[
      'TOTAL',
      `$${totalSistema.toLocaleString('es-AR')}`,
      `$${totalContado.toLocaleString('es-AR')}`,
      d.diferencia === 0 ? '—' : d.diferencia > 0
        ? `+$${d.diferencia.toLocaleString('es-AR')}`
        : `-$${Math.abs(d.diferencia).toLocaleString('es-AR')}`,
    ]],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3.5, textColor: [30, 30, 30], lineColor: [200, 200, 200], lineWidth: 0.2 },
    headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    footStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Resultado final ──────────────────────────────────────────
  const afterTable = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const sobrante = d.diferencia > 0;
  const faltante = d.diferencia < 0;

  doc.setFillColor(sobrante ? 230 : faltante ? 255 : 240, sobrante ? 244 : faltante ? 235 : 240, sobrante ? 230 : faltante ? 238 : 240);
  doc.roundedRect(14, afterTable, pageW - 28, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(sobrante ? 46 : faltante ? 198 : 80, sobrante ? 125 : faltante ? 40 : 80, sobrante ? 50 : faltante ? 40 : 80);

  const resultadoLabel = sobrante ? 'SOBRANTE DE CAJA' : faltante ? 'FALTANTE DE CAJA' : 'CAJA EXACTA';
  const resultadoValor = d.diferencia === 0 ? '$0' : `$${Math.abs(d.diferencia).toLocaleString('es-AR')}`;

  doc.text(resultadoLabel, 22, afterTable + 10);
  doc.setFontSize(14);
  doc.text(resultadoValor, pageW - 22, afterTable + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    sobrante ? 'El cajero recaudó más de lo esperado por el sistema.'
    : faltante ? 'El cajero recaudó menos de lo esperado por el sistema.'
    : 'Los montos del sistema coinciden exactamente con lo contado.',
    22, afterTable + 17
  );

  // ── Firma ────────────────────────────────────────────────────
  const firmaY = afterTable + 38;
  doc.setDrawColor(150, 150, 150);
  doc.line(14, firmaY, 90, firmaY);
  doc.line(pageW / 2 + 10, firmaY, pageW - 14, firmaY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Firma del cajero', 14, firmaY + 5);
  doc.text('Firma del supervisor', pageW / 2 + 10, firmaY + 5);

  // ── Pie ──────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(180, 180, 180);
  doc.line(14, pageH - 12, pageW - 14, pageH - 12);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${fechaStr} a las ${horaStr}`, 14, pageH - 7);
  doc.text(`Turno #${d.turnoId} · ${d.cajeroNombre}`, pageW - 14, pageH - 7, { align: 'right' });

  doc.save(`cierre-caja-turno-${d.turnoId}.pdf`);
};