import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarLog } from "@/lib/audit";

/** GET /api/configuracoes/taxas — retorna tabela de taxas de parcelamento */
export async function GET() {
  try {
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    const data   = (config?.data as Record<string, unknown>) ?? {};
    const taxas  = (data.taxasParcelamento as Record<string, number>) ?? {};
    return NextResponse.json(taxas);
  } catch (e) {
    console.error(e);
    return NextResponse.json({}, { status: 500 });
  }
}

/** POST /api/configuracoes/taxas — salva tabela de taxas */
export async function POST(req: NextRequest) {
  try {
    const novasTaxas = await req.json();
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    const dataAtual  = (config?.data as Record<string, unknown>) ?? {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeData = JSON.parse(JSON.stringify({ ...dataAtual, taxasParcelamento: novasTaxas })) as any;
    await prisma.config.upsert({
      where:  { id: "singleton" },
      create: { id: "singleton", data: safeData },
      update: { data: safeData },
    });

    // Registra log de auditoria
    await registrarLog(
      "EDITAR_TAXAS",
      "Tabela de taxas de parcelamento atualizada com novos valores de juros."
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar taxas." }, { status: 500 });
  }
}
