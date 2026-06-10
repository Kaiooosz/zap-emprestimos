import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/configuracoes/templates
 * Propósito: Atualiza o conteúdo textual de um template de mensagem de cobrança persistido no banco de dados (tabela Template).
 * Recebe: { id: string, conteudo: string }
 */
export async function POST(request: Request) {
  try {
    const { id, conteudo } = await request.json();

    if (!id || typeof conteudo !== "string") {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const template = await prisma.template.update({
      where: { id },
      data: { conteudo },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("Erro ao salvar template:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
