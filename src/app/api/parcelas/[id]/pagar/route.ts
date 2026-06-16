import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarLog } from "@/lib/audit";

const TAXA_DIARIA = 1; // 1% ao dia

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body   = await req.json().catch(() => ({}));

    const parcela = await prisma.parcela.findUnique({
      where:   { id },
      include: { emprestimo: { include: { cliente: true } } },
    });
    if (!parcela) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const modo       = body.modo ?? "COMPLETO";
    const hoje       = new Date();
    const venc       = new Date(parcela.dataVencimento);
    const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86400000));
    const taxaDiaria = Number(parcela.emprestimo.taxaAtraso ?? 1);
    const regra = parcela.emprestimo.regraAtraso ?? "PARCELA";
    
    const baseCalculo = regra === "SALDO"
      ? Math.max(0, Number(parcela.valorDevido) - Number(parcela.valorPago || 0))
      : Number(parcela.valorDevido);

    const jurosAtraso = diasAtraso > 0
      ? Number((baseCalculo * diasAtraso * taxaDiaria / 100).toFixed(2))
      : 0;
    const totalDevido = Number((Number(parcela.valorDevido) + jurosAtraso).toFixed(2));
    const valorPago   = body.valorPago ?? totalDevido;
    const desconto    = body.desconto ?? 0;

    let novoStatus: "PAGO" | "PARCIAL" | "PENDENTE" = "PAGO";
    const isRolavel = parcela.emprestimo.numParcelas === 1;
    if (modo === "SOMENTE_JUROS") {
      novoStatus = isRolavel ? "PAGO" : "PARCIAL";
    } else if (valorPago < totalDevido - 0.01) {
      novoStatus = "PARCIAL";
    }

    // Atualiza parcela
    const updated = await prisma.parcela.update({
      where: { id },
      data: {
        status:        novoStatus,
        valorPago:     Number(valorPago),
        dataPagamento: hoje,
        modoPagamento: modo,
        desconto:      desconto > 0 ? desconto : null,
      },
    });

    // Se for rolável e pagou apenas juros, gera a próxima parcela pendente para renovação
    if (isRolavel && modo === "SOMENTE_JUROS") {
      const proxVenc = new Date(parcela.dataVencimento);
      const tipo = parcela.emprestimo.tipo; // DIARIO, SEMANAL, QUINZENAL, MENSAL
      
      if (tipo === "MENSAL") {
        proxVenc.setMonth(proxVenc.getMonth() + 1);
        const day = new Date(parcela.dataVencimento).getDate();
        if (proxVenc.getDate() !== day) {
          proxVenc.setDate(0);
        }
      } else if (tipo === "QUINZENAL") {
        proxVenc.setDate(proxVenc.getDate() + 15);
      } else if (tipo === "SEMANAL") {
        proxVenc.setDate(proxVenc.getDate() + 7);
      } else if (tipo === "DIARIO") {
        proxVenc.setDate(proxVenc.getDate() + 1);
      }

      await prisma.parcela.create({
        data: {
          emprestimoId:   parcela.emprestimoId,
          numero:         parcela.numero + 1,
          valorDevido:    parcela.valorDevido,
          valorPrincipal: parcela.valorPrincipal,
          valorJuros:     parcela.valorJuros,
          status:         "PENDENTE",
          dataVencimento: proxVenc,
        },
      });

      // Atualiza dataVencimento final do empréstimo para o novo vencimento
      await prisma.emprestimo.update({
        where: { id: parcela.emprestimoId },
        data: { dataVencimento: proxVenc },
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
    await registrarLog(
      "LIQUIDAR_PARCELA",
      `Pagamento de R$ ${Number(valorPago).toFixed(2)} registrado para a parcela ${parcela.numero} (Contrato ID: ${parcela.emprestimoId}) do cliente ${parcela.emprestimo.cliente.nome}. Modo: ${modo}${txtQuitado}.`
    );

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

    return NextResponse.json({ ...updated, jurosAtraso, totalDevido });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao registrar pagamento." }, { status: 500 });
  }
}
