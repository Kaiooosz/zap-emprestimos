import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface FormaPagamentoPDF {
  tipo: string;
  label: string;
  descricao?: string;
  valor: number;
}

export interface EntradaParcialPDF {
  id: string;
  valor: number;
  data: string;
  operador: string;
  formas: FormaPagamentoPDF[];
  modo: string;
}

export interface DadosComprovante {
  idTransferencia: string;
  dataPagamento: string;
  clienteNome: string;
  clientePhone?: string;
  parcelaNumero: number;
  emprestimoId: string;
  valorTotal: number;
  valorPrincipal?: number;
  valorJuros?: number;
  valorJurosAtraso?: number;
  saldoRestante: number;
  modo: string;
  isParcial: boolean;
  destinoAbatimento?: string;
  diasAtraso?: number;
  operadorNome?: string;
  nomeEmpresa?: string;
  formasPagamento?: FormaPagamentoPDF[];
  entradas?: EntradaParcialPDF[];
}

function formatMoeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modoLabel(modo: string): string {
  const map: Record<string, string> = {
    COMPLETO: "Pagamento Completo",
    SOMENTE_JUROS: "Pagamento Somente Juros",
    ANTECIPADO: "Pagamento Antecipado",
    QUITACAO_TOTAL: "Quitação Total",
    DETALHADO: "Baixa Detalhada (Manual)",
    ABATIMENTO: "Abatimento Parcial",
  };
  return map[modo] ?? modo;
}

export function gerarComprovantePDF(dados: DadosComprovante): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const empresa = dados.nomeEmpresa ?? "Zap Empréstimos";
  const pageW = doc.internal.pageSize.getWidth();

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(empresa, 14, 14);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("COMPROVANTE DE PAGAMENTO", 14, 22);
  doc.text("Confirmação manual pela equipe", 14, 29);

  // ID de transferência no canto superior direito
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`ID: ${dados.idTransferencia}`, pageW - 14, 18, { align: "right" });
  doc.text(formatData(dados.dataPagamento), pageW - 14, 26, { align: "right" });

  // ── Status Banner ──────────────────────────────────────────────────────────
  const statusColor = dados.saldoRestante <= 0 ? [16, 185, 129] : [59, 130, 246];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(0, 34, pageW, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const statusTxt = dados.saldoRestante <= 0 ? "✓  PARCELA QUITADA" : "◑  PAGAMENTO PARCIAL REGISTRADO";
  doc.text(statusTxt, pageW / 2, 40.5, { align: "center" });

  // ── Informações ────────────────────────────────────────────────────────────
  let y = 54;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO PAGAMENTO", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");

  const infoRows: [string, string][] = [
    ["Cliente", dados.clienteNome],
    ["Parcela Nº", String(dados.parcelaNumero)],
    ["Contrato (ID)", dados.emprestimoId],
    ["Modalidade", modoLabel(dados.modo)],
    ["Confirmado por", dados.operadorNome ?? "Operador"],
    ["Data/Hora", formatData(dados.dataPagamento)],
  ];
  if (dados.clientePhone) infoRows.splice(1, 0, ["Telefone", dados.clientePhone]);

  for (const [label, value] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(value, 65, y);
    y += 6;
  }

  // ── Caixa "Confirmado por" em destaque ─────────────────────────────────────
  y += 2;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, y, pageW - 28, 12, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Aprovado e registrado por:", 18, y + 5);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(dados.operadorNome ?? "Operador", 18, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Membro da equipe responsável pelo lançamento", pageW - 18, y + 7.5, { align: "right" });
  y += 18;

  // ── Tabela de Detalhamento ─────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("DETALHAMENTO FINANCEIRO", 14, y);
  y += 4;

  const linhasTabela: (string | number)[][] = [];

  if (dados.modo === "DETALHADO" && dados.valorPrincipal !== undefined) {
    linhasTabela.push(["Principal (Capital)", formatMoeda(dados.valorPrincipal), "—"]);
    linhasTabela.push(["Juros da Parcela", formatMoeda(dados.valorJuros ?? 0), "—"]);
    if ((dados.valorJurosAtraso ?? 0) > 0) {
      linhasTabela.push(["Juros de Atraso", formatMoeda(dados.valorJurosAtraso ?? 0), `${dados.diasAtraso ?? 0} dias`]);
    }
  } else {
    linhasTabela.push(["Valor Recebido", formatMoeda(dados.valorTotal), modoLabel(dados.modo)]);
    if ((dados.valorJurosAtraso ?? 0) > 0) {
      linhasTabela.push(["Incl. Juros de Atraso", formatMoeda(dados.valorJurosAtraso ?? 0), `${dados.diasAtraso ?? 0} dias`]);
    }
    if (dados.isParcial && dados.destinoAbatimento) {
      linhasTabela.push([
        "Abatido do",
        dados.destinoAbatimento === "PRINCIPAL" ? "Capital (Principal)" : "Juros da Parcela",
        "—",
      ]);
    }
  }

  linhasTabela.push(["", "", ""]);
  linhasTabela.push(["TOTAL PAGO", formatMoeda(dados.valorTotal), ""]);
  linhasTabela.push([
    "SALDO RESTANTE",
    formatMoeda(Math.max(0, dados.saldoRestante)),
    dados.saldoRestante <= 0 ? "QUITADO ✓" : "PENDENTE",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Descrição", "Valor", "Observação"]],
    body: linhasTabela,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50, halign: "right" },
      2: { cellWidth: 55, halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      const isLast = data.row.index >= linhasTabela.length - 2;
      if (isLast && data.column.index <= 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  // ── Meios de Pagamento ─────────────────────────────────────────────────────
  if (dados.formasPagamento && dados.formasPagamento.length > 0) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("MEIOS DE PAGAMENTO UTILIZADOS", 14, y);
    y += 4;

    const linhasFormas = dados.formasPagamento.map(f => [
      f.label + (f.descricao ? ` — ${f.descricao}` : ""),
      formatMoeda(f.valor),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Meio", "Valor"]],
      body: linhasFormas,
      theme: "grid",
      headStyles: { fillColor: [51, 65, 85], textColor: [255,255,255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      columnStyles: { 0: { cellWidth: 115 }, 1: { cellWidth: 60, halign: "right" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY + 8;
  }

  // ── Histórico de Entradas Parciais ─────────────────────────────────────────
  if (dados.entradas && dados.entradas.length > 1) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("HISTÓRICO DE ENTRADAS DO CLIENTE", 14, y);
    y += 4;

    const linhasEntradas = dados.entradas.map((e, i) => [
      `#${i + 1}`,
      new Date(e.data).toLocaleDateString("pt-BR"),
      formatMoeda(e.valor),
      e.formas.map(f => f.label ?? f.tipo).join(", ") || "—",
      e.operador,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Data", "Valor", "Meios", "Confirmado por"]],
      body: linhasEntradas,
      theme: "grid",
      headStyles: { fillColor: [51, 65, 85], textColor: [255,255,255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 28 },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 60 },
        4: { cellWidth: 42 },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY + 8;
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  const rodapeY = y + 6;

  doc.setDrawColor(226, 232, 240);
  doc.line(14, rodapeY - 4, pageW - 14, rodapeY - 4);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Este comprovante foi gerado pelo sistema ${empresa} e confirma o lançamento manual realizado pela equipe.`,
    pageW / 2,
    rodapeY,
    { align: "center" }
  );
  doc.text(
    `ID de Transferência: ${dados.idTransferencia}  |  Confirmado por: ${dados.operadorNome ?? "Operador"}  |  ${formatData(dados.dataPagamento)}`,
    pageW / 2,
    rodapeY + 5,
    { align: "center" }
  );

  const nomeArquivo = `Comprovante_${dados.idTransferencia}_Parcela${dados.parcelaNumero}.pdf`;
  doc.save(nomeArquivo);
}
