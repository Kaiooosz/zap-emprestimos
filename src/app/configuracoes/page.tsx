import { prisma } from "@/lib/prisma";
import { ConfiguracoesClient } from "@/components/configuracoes/ConfiguracoesClient";

export const dynamic = "force-dynamic";

const defaultEmpresa = {
  razaoSocial: "Zap Empréstimos LTDA", nomeFantasia: "Zap Empréstimos",
  cnpj: "", telefone: "", email: "", endereco: "",
  taxaJurosPadrao: 10, limiteEmprestimoMin: 200, limiteEmprestimoMax: 50000,
};
const defaultWhatsapp = {
  apiUrl: "", apiKey: "", instance: "", status: "NAO_CONFIGURADO" as const,
  numeroBusiness: "", notificacoes7h: true, notificacoes8h: true,
  notificacoes12h: true, enviarBemVindas: true, enviarLembrete3dias: true, enviarQuitacao: true,
};
const defaultTaxas = { 2:45, 3:60, 4:75, 5:90, 6:105, 7:120, 8:135, 9:150, 10:165 };

export default async function ConfiguracoesPage() {
  const [configRow, templates] = await Promise.all([
    prisma.config.findUnique({ where: { id: "singleton" } }),
    prisma.template.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const cfg               = (configRow?.data as any) ?? {};
  const empresa           = { ...defaultEmpresa,   ...(cfg.empresa   ?? {}) };
  const whatsapp          = { ...defaultWhatsapp,  ...(cfg.whatsapp  ?? {}) };
  const taxasParcelamento = { ...defaultTaxas,     ...(cfg.taxasParcelamento ?? {}) };

  const templatesMapped = templates.map((t) => ({
    id: t.id, nome: t.nome, tipo: "COBRANCA" as const, conteudo: t.conteudo, ativo: t.ativo, createdAt: t.createdAt.toISOString(),
  }));

  return (
    <ConfiguracoesClient
      empresa={empresa}
      whatsapp={whatsapp}
      templates={templatesMapped}
      taxasParcelamento={taxasParcelamento}
    />
  );
}
