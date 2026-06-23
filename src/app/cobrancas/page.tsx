import { prisma } from "@/lib/prisma";
import { CobrancasClient } from "@/components/cobrancas/CobrancasClient";

export const dynamic = "force-dynamic";

export default async function CobrancasPage() {
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  // Marca parcelas vencidas como ATRASADO (1 dia após o vencimento)
  await prisma.parcela.updateMany({
    where: {
      status:         "PENDENTE",
      dataVencimento: { lt: inicioHoje },
    },
    data: { status: "ATRASADO" },
  });

  const parcelas = await prisma.parcela.findMany({
    where:   { status: { in: ["ATRASADO", "PENDENTE"] } },
    include: { emprestimo: { include: { cliente: true, parcelas: true } } },
    orderBy: { dataVencimento: "asc" },
  });

  const pendentes = parcelas.map((p) => {
    const venc       = new Date(p.dataVencimento);
    const diasAtraso = p.status === "ATRASADO"
      ? Math.max(0, Math.floor((inicioHoje.getTime() - venc.getTime()) / 86400000))
      : 0;
    return {
      id:            p.id,
      parcelaNum:    p.numero,
      totalParcelas: p.emprestimo.numParcelas,
      clienteId:     p.emprestimo.cliente.id,
      clienteNome:   p.emprestimo.cliente.nome,
      clientePhone:  p.emprestimo.cliente.phone,
      score:         p.emprestimo.cliente.score,
      valorDevido:   Number(p.valorDevido),
      valorPago:     Number(p.valorPago ?? 0),
      dataVencimento: p.dataVencimento.toISOString(),
      status:        p.status,
      diasAtraso,
      emprestimoId:  p.emprestimoId,
      fullParcela:   p as any,
      saldoDevedor:  p.emprestimo.parcelas.filter((parc) => parc.status !== "PAGO").reduce((acc, parc) => acc + Number(parc.valorDevido) - Number(parc.valorPago || 0), 0),
      taxaJuros:     Number(p.emprestimo.taxaJuros),
      dataInicioPeriodo: p.emprestimo.dataInicio.toISOString(),
      tipoTaxaAtraso: "PERCENTUAL",
    };
  }).sort((a, b) => b.diasAtraso - a.diasAtraso);

  const [templates, config] = await Promise.all([
    prisma.template.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.config.findUnique({ where: { id: "singleton" } }),
  ]);

  const cfg       = (config?.data as Record<string, unknown>) ?? {};
  const empresa   = (cfg.empresa   as Record<string, string>)  ?? {};
  const whatsapp  = (cfg.whatsapp  as Record<string, string>)  ?? {};
  const operacional = (cfg.operacional as Record<string, unknown>) ?? {};

  // Regra de atraso e taxa diária configuráveis na config (padrões: Regra A, 1%/dia)
  const regraAtraso = (operacional.regraAtraso as "A" | "B") ?? "A";
  const taxaDiaria  = Number(operacional.taxaDiaria ?? 1);

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
      empresaNome={empresa.nomeFantasia ?? "Zap Emprestimos"}
      empresaTelefone={empresa.telefone ?? ""}
      whatsappStatus={(whatsapp.status as any) ?? "NAO_CONFIGURADO"}
      regraAtraso={regraAtraso}
      taxaDiaria={taxaDiaria}
    />
  );
}
