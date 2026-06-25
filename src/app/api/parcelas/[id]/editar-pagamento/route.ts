import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parcela = await prisma.parcela.findUnique({
      where: { id },
      include: { emprestimo: { include: { cliente: true } } },
    });

    if (!parcela) {
      return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
    }

    if (parcela.status === "PENDENTE" || parcela.status === "ATRASADO") {
      return NextResponse.json({ error: "Apenas parcelas pagas podem ser editadas." }, { status: 400 });
    }

    const session = await getSession();
    const operadorNome = session?.nome ?? "Sistema";

    // Atualiza apenas os metadados: data e formas de pagamento
    const { dataPagamento, formasPagamento } = body;

    const dataPagamentoAtualizada = dataPagamento ? new Date(dataPagamento) : parcela.dataPagamento;

    await prisma.parcela.update({
      where: { id },
      data: {
        dataPagamento: dataPagamentoAtualizada,
        formasPagamento: JSON.stringify(formasPagamento),
      },
    });

    // Registra auditoria
    const msgLog = `O operador ${operadorNome} editou os metadados do pagamento da parcela ${parcela.numero} (Contrato ID: ${parcela.emprestimoId}) do cliente ${parcela.emprestimo.cliente.nome}. Nova Data: ${dataPagamentoAtualizada?.toLocaleString("pt-BR")}.`;
    await registrarLog("EDITAR_PAGAMENTO", msgLog);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao editar pagamento" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const parcela = await prisma.parcela.findUnique({
      where: { id },
      include: {
        emprestimo: {
          include: { cliente: true }
        }
      },
    });

    if (!parcela) {
      return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
    }

    if (!parcela.valorPago || Number(parcela.valorPago) === 0) {
      return NextResponse.json({ error: "Esta parcela não possui pagamentos para estornar." }, { status: 400 });
    }

    const session = await getSession();
    const operadorNome = session?.nome ?? "Sistema";

    let entradas: any[] = [];
    try {
      if (parcela.entradas) {
        entradas = JSON.parse(parcela.entradas);
      }
    } catch (e) {
      entradas = [];
    }

    let novoStatus: any = "PENDENTE";
    let novoPrincipal = Number(parcela.valorPrincipal);
    let novoJuros = Number(parcela.valorJuros);
    let novoDevido = Number(parcela.valorDevido);
    let novoValorPago = Number(parcela.valorPago || 0);
    let novasEntradas: string | null = null;
    let novasFormasPagamento: string | null = parcela.formasPagamento;
    let valorEstornado = 0;
    let novoVencimento = parcela.dataVencimento;
    let dataVencimentoRestaurada: Date | null = null;

    if (entradas.length > 0) {
      const ultimaEntrada = entradas[entradas.length - 1];
      valorEstornado = ultimaEntrada.valor;

      if (ultimaEntrada.valoresAnteriores) {
        // Estorno exato
        novoPrincipal = Number(ultimaEntrada.valoresAnteriores.valorPrincipal);
        novoJuros = Number(ultimaEntrada.valoresAnteriores.valorJuros);
        novoDevido = Number(ultimaEntrada.valoresAnteriores.valorDevido);
        novoStatus = ultimaEntrada.valoresAnteriores.status;
        if (ultimaEntrada.valoresAnteriores.dataVencimento) {
          novoVencimento = new Date(ultimaEntrada.valoresAnteriores.dataVencimento);
          dataVencimentoRestaurada = novoVencimento;
        }
      } else {
        // Fallback para histórico antigo
        if (entradas.length === 1) {
          novoPrincipal = Number(parcela.valorPrincipal);
          novoJuros = Number(parcela.valorJuros);
          novoDevido = novoPrincipal + novoJuros;
          
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const venc = new Date(parcela.dataVencimento);
          venc.setHours(0, 0, 0, 0);
          novoStatus = hoje.getTime() > venc.getTime() ? "ATRASADO" : "PENDENTE";
        } else {
          novoPrincipal = Number(parcela.valorPrincipal) + valorEstornado;
          novoJuros = Number(parcela.valorJuros);
          novoDevido = novoPrincipal + novoJuros;
          novoStatus = "PARCIAL";
        }
      }

      // Remove a última entrada
      const filtrasEntradas = entradas.slice(0, -1);
      novoValorPago = Math.max(0, Number((novoValorPago - valorEstornado).toFixed(2)));

      if (filtrasEntradas.length > 0) {
        novasEntradas = JSON.stringify(filtrasEntradas);
        const anterior = filtrasEntradas[filtrasEntradas.length - 1];
        novasFormasPagamento = JSON.stringify(anterior.formas || []);
      } else {
        novasEntradas = null;
        novasFormasPagamento = null;
        novoValorPago = 0;
      }
    } else {
      // Sem histórico de entradas
      valorEstornado = Number(parcela.valorPago || 0);
      novoPrincipal = Number(parcela.valorPrincipal);
      novoJuros = Number(parcela.valorJuros);
      novoDevido = novoPrincipal + novoJuros;
      novoValorPago = 0;
      novasEntradas = null;
      novasFormasPagamento = null;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const venc = new Date(parcela.dataVencimento);
      venc.setHours(0, 0, 0, 0);
      novoStatus = hoje.getTime() > venc.getTime() ? "ATRASADO" : "PENDENTE";
    }

    const novaDataPagamento = novoValorPago === 0 ? null : parcela.dataPagamento;
    const novoModoPagamento = novoValorPago === 0 ? null : parcela.modoPagamento;

    // Atualiza parcela
    await prisma.parcela.update({
      where: { id },
      data: {
        status: novoStatus,
        valorPago: novoValorPago,
        dataPagamento: novaDataPagamento,
        modoPagamento: novoModoPagamento,
        valorPrincipal: novoPrincipal,
        valorJuros: novoJuros,
        valorDevido: novoDevido,
        dataVencimento: novoVencimento,
        formasPagamento: novasFormasPagamento,
        entradas: novasEntradas,
      },
    });

    // Se o status do empréstimo estava QUITADO, volta a ser ATIVO
    if (parcela.emprestimo.status === "QUITADO") {
      await prisma.emprestimo.update({
        where: { id: parcela.emprestimoId },
        data: { status: "ATIVO" },
      });
    }

    // Se o vencimento foi restaurado e for empréstimo rolável (1 parcela), atualiza o vencimento do empréstimo também
    if (parcela.emprestimo.numParcelas === 1 && dataVencimentoRestaurada) {
      await prisma.emprestimo.update({
        where: { id: parcela.emprestimoId },
        data: { dataVencimento: dataVencimentoRestaurada },
      });
    }

    // Registra log
    const msgLog = `O operador ${operadorNome} ESTORNOU (excluiu) um pagamento de R$ ${valorEstornado.toFixed(2)} da parcela ${parcela.numero} (Contrato ID: ${parcela.emprestimoId}) do cliente ${parcela.emprestimo.cliente.nome}. Parcela retornou ao status: ${novoStatus}.`;
    await registrarLog("ESTORNAR_PAGAMENTO", msgLog);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao estornar pagamento:", err);
    return NextResponse.json({ error: `Erro ao estornar pagamento: ${err?.message || String(err)}` }, { status: 500 });
  }
}
