import { NextRequest, NextResponse } from "next/server";
import { store, TipoEmprestimo, TipoProduto, ModalidadeJuros } from "@/lib/store";
import { calcularEmprestimo } from "@/lib/calculo/juros";

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("clienteId") ?? undefined;
  const lista = store.emprestimos.list(clienteId).map((e) => ({
    ...e,
    cliente: store.clientes.get(e.clienteId),
  }));
  return NextResponse.json(lista);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    clienteId, tipo, valorPrincipal, taxaJuros, numParcelas, dataInicio, observacoes,
    tipoProduto, modalidadeJuros, temGarantia, tipoGarantia, valorGarantia, temContrato,
    // campos específicos por tipo
    taxaRenovacao, valorNominalCheque, dataCheque, custo, lucro, descricaoProduto,
    diaVencimento, semDataFim,
  } = body;

  const intervaloMap: Record<TipoEmprestimo, number> = { DIARIO: 1, SEMANAL: 7, QUINZENAL: 15, MENSAL: 30 };
  const intervalo = intervaloMap[tipo as TipoEmprestimo] ?? 30;

  const resultado = calcularEmprestimo(
    { valorPrincipal: Number(valorPrincipal), taxaJuros: Number(taxaJuros), numParcelas: Number(numParcelas), tipo: "simples" },
    new Date(dataInicio),
    intervalo
  );

  const dataVencimento = resultado.parcelas[resultado.parcelas.length - 1].dataVencimento.toISOString();
  const valorParcela = resultado.valorParcela;
  const valorJurosParcela = Math.round((resultado.totalJuros / resultado.numParcelas) * 100) / 100;
  const valorPrincipalParcela = Math.round((resultado.valorPrincipal / resultado.numParcelas) * 100) / 100;

  const e = store.emprestimos.create(
    {
      clienteId,
      operadorId: "u1",
      tipoProduto: (tipoProduto as TipoProduto) ?? "EMPRESTIMO",
      tipo,
      modalidadeJuros: (modalidadeJuros as ModalidadeJuros) ?? "SIMPLES",
      status: "ATIVO",
      valorPrincipal: resultado.valorPrincipal,
      taxaJuros: resultado.taxaJuros,
      numParcelas: resultado.numParcelas,
      dataInicio,
      dataVencimento,
      observacoes,
      temGarantia: temGarantia ?? false,
      tipoGarantia,
      valorGarantia,
      temContrato: temContrato ?? false,
      taxaRenovacao,
      valorNominalCheque,
      dataCheque,
      custo,
      lucro,
      descricaoProduto,
      diaVencimento,
      semDataFim,
    },
    resultado.parcelas.map((p, i) => {
      const isLast = i === resultado.numParcelas - 1;
      return {
        numero: i + 1,
        valorDevido: isLast ? Math.round((resultado.valorTotal - valorParcela * (resultado.numParcelas - 1)) * 100) / 100 : valorParcela,
        valorPrincipal: isLast ? Math.round((resultado.valorPrincipal - valorPrincipalParcela * (resultado.numParcelas - 1)) * 100) / 100 : valorPrincipalParcela,
        valorJuros: isLast ? Math.round((resultado.totalJuros - valorJurosParcela * (resultado.numParcelas - 1)) * 100) / 100 : valorJurosParcela,
        dataVencimento: p.dataVencimento.toISOString(),
      };
    })
  );

  return NextResponse.json({ ...e, cliente: store.clientes.get(clienteId) }, { status: 201 });
}
