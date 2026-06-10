import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/configuracoes/empresa
 * Propósito: Salva/atualiza os dados cadastrais da empresa no JSON global de configurações do singleton Config.
 * Recebe: Objeto contendo dados da empresa (razão social, CNPJ, padrão operacional, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const empresa = await req.json();
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    const dataAtual  = (config?.data as Record<string, unknown>) ?? {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeData = JSON.parse(JSON.stringify({ ...dataAtual, empresa })) as any;
    await prisma.config.upsert({
      where:  { id: "singleton" },
      create: { id: "singleton", data: safeData },
      update: { data: safeData },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar dados da empresa." }, { status: 500 });
  }
}
