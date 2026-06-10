import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cobrancas/status-fila
 * Retorna as contagens de mensagens na fila por status para exibição de progresso em tempo real no frontend.
 */
export async function GET() {
  try {
    const [pendentes, enviados, falhados] = await Promise.all([
      prisma.msgQueue.count({ where: { status: "PENDENTE" } }),
      prisma.msgQueue.count({ where: { status: "ENVIADO" } }),
      prisma.msgQueue.count({ where: { status: "FALHOU" } }),
    ]);

    const total = pendentes + enviados + falhados;

    return NextResponse.json({
      pendentes,
      enviados,
      falhados,
      total,
      finalizado: pendentes === 0,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao consultar status da fila." }, { status: 500 });
  }
}
