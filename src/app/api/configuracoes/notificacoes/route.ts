import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ConfigNotificacao {
  ativo:      boolean;
  horario:    string | null; // "HH:MM" ou null para imediato
  templateId: string | null;
}

export interface ConfigNotificacoes {
  resumoDiario:        ConfigNotificacao;
  relatorioCobrancas:  ConfigNotificacao;
  lembreteManhaAlt:    ConfigNotificacao;
  bemVindas:           ConfigNotificacao;
  lembrete3dias:       ConfigNotificacao;
  confirmacaoQuitacao: ConfigNotificacao;
}

const DEFAULTS: ConfigNotificacoes = {
  resumoDiario:        { ativo: false, horario: "07:00", templateId: null },
  relatorioCobrancas:  { ativo: false, horario: "08:00", templateId: null },
  lembreteManhaAlt:    { ativo: false, horario: "12:00", templateId: null },
  bemVindas:           { ativo: false, horario: null,    templateId: null },
  lembrete3dias:       { ativo: false, horario: "09:00", templateId: null },
  confirmacaoQuitacao: { ativo: false, horario: null,    templateId: null },
};

export async function GET() {
  try {
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    const data   = (config?.data as Record<string, unknown>) ?? {};
    const notifs = (data.notificacoes as ConfigNotificacoes) ?? DEFAULTS;
    // Garante que todos os campos existem mesmo que o banco esteja incompleto
    const merged = { ...DEFAULTS, ...notifs } as ConfigNotificacoes;
    return NextResponse.json(merged);
  } catch (e) {
    console.error(e);
    return NextResponse.json(DEFAULTS);
  }
}

export async function POST(req: NextRequest) {
  try {
    const notificacoes = await req.json() as ConfigNotificacoes;
    const config       = await prisma.config.findUnique({ where: { id: "singleton" } });
    const dataAtual    = (config?.data as Record<string, unknown>) ?? {};

    // JSON.parse(JSON.stringify()) garante um plain object compatível com Prisma.InputJsonValue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeData = JSON.parse(JSON.stringify({ ...dataAtual, notificacoes })) as any;

    await prisma.config.upsert({
      where:  { id: "singleton" },
      create: { id: "singleton", data: safeData },
      update: { data: safeData },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao salvar notificações." }, { status: 500 });
  }
}
