import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hoje  = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const semInicio = new Date(hoje); semInicio.setDate(hoje.getDate() - 7);

    const [emprestimos, parcelas] = await Promise.all([
      prisma.emprestimo.findMany({ include: { parcelas: true } }),
      prisma.parcela.findMany(),
    ]);

    const ativos          = emprestimos.filter((e) => e.status === "ATIVO");
    const parcelasAtrasadas = parcelas.filter((p) => {
      return p.status === "ATRASADO" || (
        ["PENDENTE","PARCIAL"].includes(p.status) &&
        new Date(p.dataVencimento) < inicioHoje
      );
    });
    const capitalNaRua    = ativos
      .flatMap((e) => e.parcelas.filter((p) => ["PENDENTE","ATRASADO","PARCIAL"].includes(p.status)))
      .reduce((s, p) => s + Number(p.valorDevido), 0);

    const recebidoMes = parcelas
      .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= mesInicio)
      .reduce((s, p) => s + Number(p.valorPago ?? 0), 0);

    const totalSemana = parcelas
      .filter((p) => ["PENDENTE","ATRASADO"].includes(p.status) && new Date(p.dataVencimento) >= inicioHoje && new Date(p.dataVencimento) <= new Date(inicioHoje.getTime() + 7 * 86400000))
      .reduce((s, p) => s + Number(p.valorDevido), 0);

    const lucroMes = emprestimos
      .flatMap((e) => e.parcelas.filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= mesInicio))
      .reduce((s, p) => s + Number(p.valorJuros), 0);

    // Evolução mensal (últimos 6 meses)
    const evolucaoMensal = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const recebido = parcelas
        .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= d && new Date(p.dataPagamento) <= fim)
        .reduce((s, p) => s + Number(p.valorPago ?? 0), 0);
      return { mes: d.toLocaleString("pt-BR", { month: "short" }), recebido };
    });

    // Novas métricas de Projeção
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const fimTrimestre = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0, 23, 59, 59);
    const fimSemestre = new Date(hoje.getFullYear(), hoje.getMonth() + 6, 0, 23, 59, 59);
    const fimAno = new Date(hoje.getFullYear() + 1, hoje.getMonth(), 0, 23, 59, 59);

    const parcelasAbertas = parcelas.filter((p) => ["PENDENTE", "PARCIAL", "ATRASADO"].includes(p.status));
    
    const jurosAReceber = {
      mensal: parcelasAbertas.filter((p) => new Date(p.dataVencimento) <= fimMesAtual).reduce((s, p) => s + Number(p.valorJuros), 0),
      trimestral: parcelasAbertas.filter((p) => new Date(p.dataVencimento) <= fimTrimestre).reduce((s, p) => s + Number(p.valorJuros), 0),
      semestral: parcelasAbertas.filter((p) => new Date(p.dataVencimento) <= fimSemestre).reduce((s, p) => s + Number(p.valorJuros), 0),
      anual: parcelasAbertas.filter((p) => new Date(p.dataVencimento) <= fimAno).reduce((s, p) => s + Number(p.valorJuros), 0)
    };

    const capitalAReceberMensal = parcelasAbertas.filter((p) => new Date(p.dataVencimento) <= fimMesAtual).reduce((s, p) => s + Number(p.valorPrincipal), 0);

    const inicioAmanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    const venceHoje = parcelasAbertas.filter((p) => {
      const v = new Date(p.dataVencimento);
      return v >= inicioHoje && v < inicioAmanha;
    });

    const faturamentoTotal = parcelas
      .filter((p) => p.status === "PAGO")
      .reduce((s, p) => s + Number(p.valorPago), 0);

    return NextResponse.json({
      capitalNaRua,
      recebidoMes,
      lucroMes,
      parcelasAtrasadas:    parcelasAtrasadas.length,
      totalSemana,
      totalClientesAtivos:  ativos.length,
      evolucaoMensal,
      projecoes: {
        lucroPrevisto:           ativos.flatMap((e) => e.parcelas.filter((p) => p.status === "PENDENTE")).reduce((s, p) => s + Number(p.valorJuros), 0),
        capitalEmRisco:          emprestimos.filter((e) => e.status === "INADIMPLENTE").flatMap((e) => e.parcelas.filter((p) => ["PENDENTE","ATRASADO"].includes(p.status))).reduce((s, p) => s + Number(p.valorDevido), 0),
        recebidoOntem:           parcelas.filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento).toDateString() === new Date(hoje.getTime() - 86400000).toDateString()).reduce((s, p) => s + Number(p.valorPago ?? 0), 0),
        mediaRecebimentoDiario:  recebidoMes / Math.max(1, hoje.getDate()),
        jurosAReceber,
        capitalAReceberMensal,
        venceHoje: {
          count: venceHoje.length,
          valor: venceHoje.reduce((s, p) => s + Number(p.valorDevido), 0),
        },
        capitalInvestidoVsRetorno: {
          investido: capitalNaRua,
          retorno: faturamentoTotal,
        }
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro no dashboard." }, { status: 500 });
  }
}
