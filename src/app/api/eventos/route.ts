import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/eventos
 * Retorna as últimas 8 ações registradas na trilha de auditoria para visualização rápida no painel de notificações do sistema.
 */
export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Erro ao buscar eventos recentes:", error);
    return NextResponse.json({ error: "Erro ao buscar eventos." }, { status: 500 });
  }
}
