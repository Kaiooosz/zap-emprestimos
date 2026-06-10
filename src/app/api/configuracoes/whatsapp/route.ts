import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const whatsapp = await req.json();
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    const dataAtual  = (config?.data as Record<string, unknown>) ?? {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeData = JSON.parse(JSON.stringify({ ...dataAtual, whatsapp })) as any;
    await prisma.config.upsert({
      where:  { id: "singleton" },
      create: { id: "singleton", data: safeData },
      update: { data: safeData },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar configurações do WhatsApp." }, { status: 500 });
  }
}
