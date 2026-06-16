import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptCliente } from "@/lib/crypto";
import { getSession } from "@/lib/auth";
import { registrarLog } from "@/lib/audit";
import { calcularEmprestimo } from "@/lib/calculo/juros";
import { TipoCliente, TipoProduto, TipoPeriodo, ModalidadeJuros } from "@prisma/client";

const intervaloMap: Record<string, number> = {
  DIARIO: 1, SEMANAL: 7, QUINZENAL: 15, MENSAL: 30,
};

export async function POST(req: NextRequest) {
  try {
    const { tipo, data } = await req.json();

    if (!tipo || !Array.isArray(data)) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    if (tipo === "leads") {
      const importados = [];
      for (const item of data) {
        if (!item.nome || !item.phone) continue;

        const dataCliente = {
          ...encryptCliente({
            tipo: "PESSOA_FISICA" as TipoCliente,
            nome: item.nome,
            cpf: item.cpf || null,
            phone: item.phone,
            email: item.email || null,
            endereco: item.endereco || null,
            cidade: item.cidade || null,
            estado: item.estado || null,
            profissao: item.profissao || null,
            rendaMensal: item.rendaMensal ? Number(item.rendaMensal) : null,
            score: 500,
            temContrato: false,
            garantia: false,
            tipoGarantia: null,
            valorGarantia: null,
            descGarantia: null,
            referencia: null,
            observacoes: item.observacoes || null,
          }),
          perfilTaxa: item.perfilTaxa || "10",
          taxaPadrao: item.taxaPadrao ? Number(item.taxaPadrao) : 10.0,
        };

        const cliente = await prisma.cliente.create({ data: dataCliente });
        importados.push(cliente);
      }

      await registrarLog("IMPORTAR_LEADS", `Importação em massa de ${importados.length} leads realizada.`);
      return NextResponse.json({ success: true, count: importados.length });
    }

    if (tipo === "emprestimos") {
      const session = await getSession();
      let operadorId = session?.sub;
      if (!operadorId) {
        const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
        operadorId = admin!.id;
      }

      // Carrega clientes descriptografados para associar por telefone ou CPF
      const { decryptCliente } = await import("@/lib/crypto");
      const clientesRaw = await prisma.cliente.findMany();
      const clientes = clientesRaw.map(decryptCliente);

      const importados = [];
      for (const item of data) {
        const {
          identificadorCliente, // cpf ou phone
          tipoOp, valorPrincipal, taxaJuros, numParcelas, dataInicio,
          regraAtraso, taxaAtraso, observacoes
        } = item;

        if (!identificadorCliente || !valorPrincipal || !taxaJuros || !numParcelas || !dataInicio) {
          continue;
        }

        // Acha o cliente na memória
        const cleanIdent = String(identificadorCliente).replace(/\D/g, "");
        const cliente = clientes.find((c) => {
          const cCpf = c.cpf ? String(c.cpf).replace(/\D/g, "") : "";
          const cPhone = String(c.phone).replace(/\D/g, "");
          return cCpf === cleanIdent || cPhone === cleanIdent;
        });

        if (!cliente) continue;

        const pOp = tipoOp || "EMPRESTIMO";
        const pPeriodo = item.periodo || "MENSAL";
        const pModalidade = item.modalidadeJuros || "SIMPLES";

        const intervalo = intervaloMap[pPeriodo] ?? 30;
        const tipoCalc = pModalidade === "POR_PARCELA" ? "por_parcela" : "simples";

        const resultado = calcularEmprestimo(
          {
            valorPrincipal: Number(valorPrincipal),
            taxaJuros: Number(taxaJuros),
            numParcelas: Number(numParcelas),
            tipo: tipoCalc
          },
          new Date(dataInicio),
          intervalo
        );

        const dataVenc = resultado.parcelas[resultado.parcelas.length - 1].dataVencimento.toISOString();
        const vp = resultado.valorParcela;
        const vjParcela = Math.round((resultado.totalJuros / resultado.numParcelas) * 100) / 100;
        const vpParcela = Math.round((resultado.valorPrincipal / resultado.numParcelas) * 100) / 100;

        const emprestimo = await prisma.emprestimo.create({
          data: {
            clienteId: cliente.id,
            operadorId,
            tipoProduto: pOp as TipoProduto,
            tipo: pPeriodo as TipoPeriodo,
            modalidadeJuros: pModalidade as ModalidadeJuros,
            status: "ATIVO",
            valorPrincipal: resultado.valorPrincipal,
            taxaJuros: resultado.taxaJuros,
            totalJuros: resultado.totalJuros,
            valorTotal: resultado.valorTotal,
            numParcelas: resultado.numParcelas,
            dataInicio: new Date(dataInicio),
            dataVencimento: new Date(dataVenc),
            observacoes: observacoes || null,
            regraAtraso: regraAtraso || "PARCELA",
            taxaAtraso: taxaAtraso !== undefined ? Number(taxaAtraso) : 1.0,
            tipoTaxaAtraso: "PERCENTUAL",
            parcelas: {
              create: resultado.parcelas.map((p, i) => {
                const isLast = i === resultado.numParcelas - 1;
                return {
                  numero: i + 1,
                  valorDevido: isLast ? Math.round((resultado.valorTotal - vp * (resultado.numParcelas - 1)) * 100) / 100 : vp,
                  valorPrincipal: isLast ? Math.round((resultado.valorPrincipal - vpParcela * (resultado.numParcelas - 1)) * 100) / 100 : vpParcela,
                  valorJuros: isLast ? Math.round((resultado.totalJuros - vjParcela * (resultado.numParcelas - 1)) * 100) / 100 : vjParcela,
                  dataVencimento: p.dataVencimento,
                  status: "PENDENTE" as const,
                };
              }),
            },
          }
        });
        importados.push(emprestimo);
      }

      await registrarLog("IMPORTAR_EMPRESTIMOS", `Importação em massa de ${importados.length} empréstimos realizada.`);
      return NextResponse.json({ success: true, count: importados.length });
    }

    return NextResponse.json({ error: "Tipo de importação inválido." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro na importação em massa." }, { status: 500 });
  }
}
