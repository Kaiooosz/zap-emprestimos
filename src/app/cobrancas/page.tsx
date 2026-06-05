import { prisma } from "@/lib/prisma";
import { CobrancasClient } from "@/components/cobrancas/CobrancasClient";

export const dynamic = "force-dynamic";

export default async function CobrancasPage() {
  const hoje = new Date();

  // Marca parcelas atrasadas
  await prisma.parcela.updateMany({
    where: {
      status:        "PENDENTE",
      dataVencimento: { lt: hoje },
    },
    data: { status: "ATRASADO" },
  });

  const parcelas = await prisma.parcela.findMany({
    where:   { status: { in: ["ATRASADO","PENDENTE"] } },
    include: { emprestimo: { include: { cliente: true } } },
    orderBy: { dataVencimento: "asc" },
  });

  const pendentes = parcelas.map((p) => {
    const venc       = new Date(p.dataVencimento);
    const diasAtraso = p.status === "ATRASADO"
      ? Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86400000))
      : 0;
    return {
      id:           p.id,
      parcelaNum:   p.numero,
      totalParcelas:p.emprestimo.numParcelas,
      clienteId:    p.emprestimo.cliente.id,
      clienteNome:  p.emprestimo.cliente.nome,
      clientePhone: p.emprestimo.cliente.phone,
      score:        p.emprestimo.cliente.score,
      valorDevido:  Number(p.valorDevido),
      dataVencimento: p.dataVencimento.toISOString(),
      status:       p.status,
      diasAtraso,
      emprestimoId: p.emprestimoId,
    };
  }).sort((a, b) => b.diasAtraso - a.diasAtraso);

  const [templates, config] = await Promise.all([
    prisma.template.findMany({ where: { ativo: true } }),
    prisma.config.findUnique({ where: { id: "singleton" } }),
  ]);

  const cfg       = (config?.data as any) ?? {};
  const empresa   = cfg.empresa   ?? {};
  const whatsapp  = cfg.whatsapp  ?? {};

  const templatesMapped = templates.map((t) => ({
    id:        t.id,
    nome:      t.nome,
    tipo:      "COBRANCA" as const,
    conteudo:  t.conteudo,
    ativo:     t.ativo,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <CobrancasClient
      pendentes={pendentes}
      templates={templatesMapped}
      empresaNome={empresa.nomeFantasia ?? "Zap Empréstimos"}
      empresaTelefone={empresa.telefone ?? ""}
      whatsappStatus={whatsapp.status ?? "NAO_CONFIGURADO"}
    />
  );
}
