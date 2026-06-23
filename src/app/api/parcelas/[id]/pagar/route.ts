import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarLog } from "@/lib/audit";
import { liquidarDetalhado } from "@/lib/calculo/liquidacao";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body   = await req.json().catch(() => ({}));

    const parcela = await prisma.parcela.findUnique({
      where:   { id },
      include: { emprestimo: { include: { cliente: true } } },
    });
    if (!parcela) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const cobrarJurosAtraso = body.cobrarJurosAtraso ?? true;
    const destinoAbatimento = body.destinoAbatimento ?? "PRINCIPAL"; // "PRINCIPAL" | "JUROS" | "NENHUM"

    const modo       = body.modo ?? "COMPLETO";
    const hoje       = new Date();
    const venc       = new Date(parcela.dataVencimento);
    const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86400000));
    const taxaDiaria = Number(parcela.emprestimo.taxaAtraso ?? 1);
    const regra = parcela.emprestimo.regraAtraso ?? "PARCELA";
    const tipoTaxa = parcela.emprestimo.tipoTaxaAtraso ?? "PERCENTUAL";
    
    const baseCalculo = regra === "SALDO"
      ? Math.max(0, Number(parcela.valorDevido) - Number(parcela.valorPago || 0))
      : Number(parcela.valorDevido);

    const jurosAtraso = (diasAtraso > 0 && cobrarJurosAtraso)
      ? (tipoTaxa === "VALOR"
          ? Number((taxaDiaria * diasAtraso).toFixed(2))
          : Number((baseCalculo * diasAtraso * taxaDiaria / 100).toFixed(2)))
      : 0;
    const totalDevido = Number((Number(parcela.valorDevido) + jurosAtraso).toFixed(2));
    let valorPago     = Number(body.valorPago ?? totalDevido);
    const desconto    = body.desconto ?? 0;

    let novoStatus: "PAGO" | "PARCIAL" | "PENDENTE" = "PAGO";
    const isRolavel = parcela.emprestimo.numParcelas === 1;

    let novoPrincipal = Number(parcela.valorPrincipal);
    let novoJuros     = Number(parcela.valorJuros);
    let novoDevido    = Number(parcela.valorDevido);

    if (modo === "DETALHADO") {
      const vPrincipalPago = Number(body.valorPrincipalPago ?? 0);
      const vJurosPago = Number(body.valorJurosPago ?? 0);
      const vJurosAtrasoPago = Number(body.valorJurosAtrasoPago ?? 0);

      valorPago = Number((vPrincipalPago + vJurosPago + vJurosAtrasoPago).toFixed(2));
      
      const resDet = liquidarDetalhado({
        valorPrincipal: Number(parcela.valorPrincipal),
        valorJuros: Number(parcela.valorJuros),
        vPrincipalPago,
        vJurosPago,
      });

      novoPrincipal = resDet.novoPrincipal;
      novoJuros = resDet.novoJuros;
      novoDevido = resDet.novoDevido;
      novoStatus = resDet.status;
    } else {
      if (modo === "SOMENTE_JUROS") {
        novoStatus = isRolavel ? "PAGO" : "PARCIAL";
      } else if (valorPago < totalDevido - 0.01) {
        novoStatus = "PARCIAL";
      }

      if (novoStatus === "PARCIAL") {
        let valorRestante = valorPago;
        let jurosAtrasoPago = 0;
        if (jurosAtraso > 0) {
          jurosAtrasoPago = Math.min(jurosAtraso, valorRestante);
          valorRestante = Math.max(0, valorRestante - jurosAtrasoPago);
        }

        if (valorRestante > 0) {
          if (destinoAbatimento === "PRINCIPAL") {
            novoPrincipal = Math.max(0, Number(parcela.valorPrincipal) - valorRestante);
          } else if (destinoAbatimento === "JUROS") {
            novoJuros = Math.max(0, Number(parcela.valorJuros) - valorRestante);
          }
        }
        novoDevido = Number((novoPrincipal + novoJuros).toFixed(2));
      }
    }

    // Meios de pagamento e entradas
    const formasPagamento = body.formasPagamento ?? [];
    const session = await getSession();
    const operadorNome = session?.nome ?? "Sistema";

    // Acumula histórico de entradas parciais
    let entradasAntigas: any[] = [];
    try {
      if ((parcela as any).entradas) {
        entradasAntigas = JSON.parse((parcela as any).entradas);
      }
    } catch (err) {
      entradasAntigas = [];
    }
    const novaEntrada = {
      id: `ENT-${Date.now()}`,
      valor: Number(valorPago.toFixed(2)),
      data: hoje.toISOString(),
      operador: operadorNome,
      formas: formasPagamento,
      modo,
      valoresAnteriores: {
        valorPrincipal: Number(parcela.valorPrincipal),
        valorJuros: Number(parcela.valorJuros),
        valorDevido: Number(parcela.valorDevido),
        status: parcela.status,
      }
    };
    const entradasAtualizadas = [...entradasAntigas, novaEntrada];

    // Lógica de Rolagem: Se pagou apenas juros, joga a parcela pra frente (mesmo se for parcelado)
    let novaDataVencimento = parcela.dataVencimento;
    if (modo === "SOMENTE_JUROS") {
      const tipo = parcela.emprestimo.tipo; // DIARIO, SEMANAL, QUINZENAL, MENSAL
      const proxVenc = new Date(parcela.dataVencimento);
      if (tipo === "MENSAL") proxVenc.setMonth(proxVenc.getMonth() + 1);
      else if (tipo === "QUINZENAL") proxVenc.setDate(proxVenc.getDate() + 15);
      else if (tipo === "SEMANAL") proxVenc.setDate(proxVenc.getDate() + 7);
      else if (tipo === "DIARIO") proxVenc.setDate(proxVenc.getDate() + 1);
      
      novaDataVencimento = proxVenc;
      novoStatus = "PENDENTE"; // Volta a ser PENDENTE pois o prazo foi rolado
    }

    // Atualiza parcela
    const updated = await prisma.parcela.update({
      where: { id },
      data: {
        status:          novoStatus,
        valorPago:       Number((Number(parcela.valorPago || 0) + valorPago).toFixed(2)),
        dataPagamento:   hoje,
        modoPagamento:   modo,
        desconto:        desconto > 0 ? desconto : null,
        valorPrincipal:  novoPrincipal,
        valorJuros:      novoJuros,
        valorDevido:     novoDevido,
        dataVencimento:  novaDataVencimento, // Atualiza se rolou o juros
        formasPagamento: JSON.stringify(formasPagamento),
        entradas:        JSON.stringify(entradasAtualizadas),
      },
    });

    // Se for rolável e pagou apenas juros, gera a próxima parcela pendente para renovação.
    // Como agora empurramos a parcela atual pra frente (novaDataVencimento), no caso rolável podemos manter a mesma parcela, não precisamos criar uma duplicada, pois ela é 1/1.
    // Mas para manter compatibilidade:
    if (isRolavel && modo === "SOMENTE_JUROS") {
      // Atualiza dataVencimento final do empréstimo para o novo vencimento
      await prisma.emprestimo.update({
        where: { id: parcela.emprestimoId },
        data: { dataVencimento: novaDataVencimento },
      });
    }

    // Verifica se o empréstimo foi quitado
    const todasParcelas = await prisma.parcela.findMany({ where: { emprestimoId: parcela.emprestimoId } });
    const todasPagas    = todasParcelas.every((p) => p.id === id ? novoStatus === "PAGO" : p.status === "PAGO");
    if (todasPagas) {
      await prisma.emprestimo.update({ where: { id: parcela.emprestimoId }, data: { status: "QUITADO" } });
    }

    // Registra log de auditoria
    const txtQuitado = todasPagas ? " (Contrato quitado com sucesso)" : "";
    let msgLog = `Pagamento de R$ ${Number(valorPago).toFixed(2)} registrado para a parcela ${parcela.numero} (Contrato ID: ${parcela.emprestimoId}) do cliente ${parcela.emprestimo.cliente.nome}. Modo: ${modo}${txtQuitado}.`;
    if (modo === "DETALHADO") {
      msgLog = `Pagamento DETALHADO de R$ ${Number(valorPago).toFixed(2)} registrado para a parcela ${parcela.numero} (Principal Pago: R$ ${body.valorPrincipalPago ?? 0}, Juros Pago: R$ ${body.valorJurosPago ?? 0}, Juros Atraso Pago: R$ ${body.valorJurosAtrasoPago ?? 0}) (Contrato ID: ${parcela.emprestimoId}) do cliente ${parcela.emprestimo.cliente.nome}.${txtQuitado}`;
    }
    await registrarLog("LIQUIDAR_PARCELA", msgLog);

    // Atualiza score do cliente
    const clienteId = parcela.emprestimo.clienteId;
    const cliente   = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (cliente) {
      let deltaScore = 0;
      let motivo     = "";

      if (novoStatus === "PAGO") {
        if (diasAtraso === 0) {
          deltaScore = 20; motivo = "Pago no prazo";
          // Bônus: verificar 5 consecutivas
          const recentes = await prisma.parcela.findMany({
            where:   { emprestimoId: parcela.emprestimoId, status: "PAGO" },
            orderBy: { dataPagamento: "desc" },
            take:    5,
          });
          if (recentes.length === 5 && recentes.every((p) => p.modoPagamento !== "SOMENTE_JUROS")) {
            deltaScore += 50; motivo = "5 pagamentos consecutivos no prazo";
          }
        } else if (diasAtraso <= 7) {
          deltaScore = -40; motivo = `Atraso de ${diasAtraso} dias`;
        } else if (diasAtraso <= 30) {
          deltaScore = -100; motivo = `Atraso de ${diasAtraso} dias`;
        } else {
          deltaScore = -200; motivo = `Atraso grave: ${diasAtraso} dias`;
        }
        if (todasPagas) { deltaScore += 100; motivo += " (contrato quitado)"; }
      }

      if (deltaScore !== 0) {
        const scoreAntes  = cliente.score;
        const scoreDepois = Math.max(0, Math.min(1000, scoreAntes + deltaScore));
        await prisma.cliente.update({ where: { id: clienteId }, data: { score: scoreDepois } });
        await prisma.scoreHistorico.create({
          data: { clienteId, tipo: motivo, descricao: motivo, pontos: deltaScore, scoreAntes, scoreDepois },
        });
      }
    }

    const idTransferencia = `TXN-${id.slice(-8).toUpperCase()}-${hoje.toISOString().slice(0, 10).replace(/-/g, "")}`;
    
    try {
      const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorPago);
      const msgStatus = novoStatus === "PAGO" ? "pagou" : "pagou parcialmente";
      await prisma.auditLog.create({
        data: {
          userNome: operadorNome,
          acao: "PAGAMENTO_RECEBIDO",
          detalhes: `O cliente ${parcela.emprestimo.cliente.nome} ${msgStatus} a parcela #${parcela.numero} no valor de ${formatoMoeda}.`,
        }
      });
    } catch (err) {
      console.error("Erro ao gerar audit log:", err);
    }

    return NextResponse.json({
      ...updated,
      jurosAtraso,
      totalDevido,
      idTransferencia,
      dataPagamento: hoje.toISOString(),
      parcelaNumero: parcela.numero,
      clienteNome: parcela.emprestimo.cliente.nome,
      emprestimoId: parcela.emprestimoId,
      contratado: todasPagas,
      operadorNome,
      formasPagamento,
      entradas: entradasAtualizadas,
    });
  } catch (e: any) {
    console.error("Erro no pagamento da parcela:", e);
    return NextResponse.json({ error: `Erro ao registrar pagamento: ${e?.message || String(e)}` }, { status: 500 });
  }
}
