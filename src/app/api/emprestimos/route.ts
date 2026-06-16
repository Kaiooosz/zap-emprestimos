import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularEmprestimo } from "@/lib/calculo/juros";
import { getSession } from "@/lib/auth";
import { registrarLog } from "@/lib/audit";

const intervaloMap: Record<string, number> = {
  DIARIO: 1, SEMANAL: 7, QUINZENAL: 15, MENSAL: 30,
};

export async function GET(req: NextRequest) {
  try {
    const clienteId = req.nextUrl.searchParams.get("clienteId") ?? undefined;
    const emprestimos = await prisma.emprestimo.findMany({
      where:   clienteId ? { clienteId } : undefined,
      include: {
        cliente:  { select: { id: true, nome: true, phone: true, score: true } },
        parcelas: { orderBy: { numero: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(emprestimos);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar contratos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body    = await req.json();
    const {
      clienteId, tipo, tipoProduto, modalidadeJuros,
      valorPrincipal, taxaJuros, numParcelas, dataInicio,
      observacoes, temGarantia, tipoGarantia, valorGarantia, temContrato,
      valorNominalCheque, dataCheque, custo, descricaoProduto,
      valorMensal, diaVencimento, semDataFim, plano,
      regraAtraso, taxaAtraso, tipoTaxaAtraso,
    } = body;

    let operadorId = session?.sub;
    if (!operadorId) {
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      operadorId  = admin!.id;
    }

    const intervalo = intervaloMap[tipo as string] ?? 30;
    const tipoCalc  = modalidadeJuros === "POR_PARCELA" ? "por_parcela" : "simples";
    const resultado = calcularEmprestimo(
      { valorPrincipal: Number(valorPrincipal), taxaJuros: Number(taxaJuros), numParcelas: Number(numParcelas), tipo: tipoCalc },
      new Date(dataInicio),
      intervalo
    );

    const dataVenc  = resultado.parcelas[resultado.parcelas.length - 1].dataVencimento.toISOString();
    const vp        = resultado.valorParcela;
    const vjParcela = Math.round((resultado.totalJuros   / resultado.numParcelas) * 100) / 100;
    const vpParcela = Math.round((resultado.valorPrincipal / resultado.numParcelas) * 100) / 100;

    const emprestimo = await prisma.emprestimo.create({
      data: {
        clienteId,
        operadorId,
        tipoProduto:        tipoProduto     ?? "EMPRESTIMO",
        tipo:               tipo            ?? "MENSAL",
        modalidadeJuros:    modalidadeJuros ?? "SIMPLES",
        status:             "ATIVO",
        valorPrincipal:     resultado.valorPrincipal,
        taxaJuros:          resultado.taxaJuros,
        totalJuros:         resultado.totalJuros,
        valorTotal:         resultado.valorTotal,
        numParcelas:        resultado.numParcelas,
        dataInicio:         new Date(dataInicio),
        dataVencimento:     new Date(dataVenc),
        observacoes:        observacoes   || null,
        temGarantia:        temGarantia   ?? false,
        tipoGarantia:       tipoGarantia  || null,
        valorGarantia:      valorGarantia  ? Number(valorGarantia)  : null,
        temContrato:        temContrato   ?? false,
        regraAtraso:        regraAtraso   || "PARCELA",
        taxaAtraso:         taxaAtraso !== undefined ? Number(taxaAtraso) : 1.0,
        tipoTaxaAtraso:     tipoTaxaAtraso || "PERCENTUAL",
        valorNominalCheque: valorNominalCheque ? Number(valorNominalCheque) : null,
        dataCheque:         dataCheque ? new Date(dataCheque) : null,
        custo:              custo        ? Number(custo) : null,
        descricaoProduto:   descricaoProduto  || null,
        valorMensal:        valorMensal   ? Number(valorMensal) : null,
        diaVencimento:      diaVencimento ? Number(diaVencimento) : null,
        semDataFim:         semDataFim    ?? false,
        plano:              plano         || null,
        parcelas: {
          create: resultado.parcelas.map((p, i) => {
            const isLast = i === resultado.numParcelas - 1;
            return {
              numero:         i + 1,
              valorDevido:    isLast ? Math.round((resultado.valorTotal - vp * (resultado.numParcelas - 1)) * 100) / 100 : vp,
              valorPrincipal: isLast ? Math.round((resultado.valorPrincipal - vpParcela * (resultado.numParcelas - 1)) * 100) / 100 : vpParcela,
              valorJuros:     isLast ? Math.round((resultado.totalJuros - vjParcela * (resultado.numParcelas - 1)) * 100) / 100 : vjParcela,
              dataVencimento: p.dataVencimento,
              status:         "PENDENTE" as const,
            };
          }),
        },
      },
      include: {
        parcelas: { orderBy: { numero: "asc" } },
        cliente:  { select: { id: true, nome: true } },
      },
    });

    // Registra log de auditoria
    await registrarLog(
      "CRIAR_EMPRESTIMO",
      `Contrato de empréstimo ID ${emprestimo.id} no valor total de R$ ${Number(emprestimo.valorTotal).toFixed(2)} cadastrado para o cliente ${emprestimo.cliente.nome}.`
    );

    return NextResponse.json(emprestimo, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar contrato." }, { status: 500 });
  }
}
