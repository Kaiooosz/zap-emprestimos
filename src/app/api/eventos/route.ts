import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/eventos
 * Retorna as últimas 8 ações registradas na trilha de auditoria para visualização rápida no painel de notificações do sistema.
 */
export async function GET() {
  try {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

    const inicioAmanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1, 0, 0, 0);
    const fimAmanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1, 23, 59, 59);

    // Consultas paralelas para performance
    const [
      logs,
      countAtrasadas,
      countHoje,
      countAmanha,
      countLeads
    ] = await Promise.all([
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.parcela.count({ where: { status: "ATRASADO" } }),
      prisma.parcela.count({ where: { status: "PENDENTE", dataVencimento: { gte: inicioHoje, lte: fimHoje } } }),
      prisma.parcela.count({ where: { status: "PENDENTE", dataVencimento: { gte: inicioAmanha, lte: fimAmanha } } }),
      prisma.cliente.count({ where: { emprestimos: { none: { status: "ATIVO" } } } })
    ]);

    const systemEvents = [];
    const baseDate = new Date().getTime();

    if (countAtrasadas > 0) {
      systemEvents.push({
        id: "sys-atrasadas",
        userId: "sistema",
        userNome: "Sistema (Alerta)",
        acao: "COBRAR_ATRASADOS",
        detalhes: `Você possui ${countAtrasadas} parcela(s) em atraso para cobrar.`,
        createdAt: new Date(baseDate).toISOString(),
        href: "/cobrancas"
      });
    }

    if (countHoje > 0) {
      systemEvents.push({
        id: "sys-hoje",
        userId: "sistema",
        userNome: "Sistema (Lembrete)",
        acao: "VENCE_HOJE",
        detalhes: `${countHoje} parcela(s) vencendo hoje. Acompanhe o recebimento.`,
        createdAt: new Date(baseDate - 1000).toISOString(),
        href: "/cobrancas"
      });
    }

    if (countAmanha > 0) {
      systemEvents.push({
        id: "sys-amanha",
        userId: "sistema",
        userNome: "Sistema (Lembrete)",
        acao: "VENCE_AMANHA",
        detalhes: `${countAmanha} parcela(s) vencendo amanhã. Envie mensagens preventivas!`,
        createdAt: new Date(baseDate - 2000).toISOString(),
        href: "/cobrancas"
      });
    }

    if (countLeads > 0) {
      systemEvents.push({
        id: "sys-leads",
        userId: "sistema",
        userNome: "Sistema (Oportunidade)",
        acao: "NOVOS_LEADS",
        detalhes: `Existem ${countLeads} cliente(s) sem contrato ativo. Ofereça um novo empréstimo!`,
        createdAt: new Date(baseDate - 3000).toISOString(),
        href: "/clientes"
      });
    }

    // Mescla os eventos de sistema com os logs normais
    const allEvents = [...systemEvents, ...logs];

    return NextResponse.json(allEvents);
  } catch (error) {
    console.error("Erro ao buscar eventos recentes:", error);
    return NextResponse.json({ error: "Erro ao buscar eventos." }, { status: 500 });
  }
}
