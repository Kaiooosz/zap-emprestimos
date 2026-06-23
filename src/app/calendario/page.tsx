import { prisma } from "@/lib/prisma";
import { CalendarioClient } from "@/components/calendario/CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  // Marca atrasadas
  await prisma.parcela.updateMany({
    where: { status: "PENDENTE", dataVencimento: { lt: inicioHoje } },
    data:  { status: "ATRASADO" },
  });

  const [parcelas, clientes, despesas] = await Promise.all([
    prisma.parcela.findMany({
      include: { emprestimo: { include: { cliente: { select: { id: true, nome: true, phone: true } } } } },
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.cliente.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.contaPagar.findMany({
      orderBy: { dataVencimento: "asc" },
    }),
  ]);

  const todasParcelas = parcelas.map((p) => ({
    ...p,
    valorDevido:  Number(p.valorDevido),
    valorPago:    p.valorPago ? Number(p.valorPago) : undefined,
    clienteId:    p.emprestimo.cliente.id,
    clienteNome:  p.emprestimo.cliente.nome,
    clientePhone: p.emprestimo.cliente.phone,
  }));

  const todasDespesas = despesas.map((d) => ({
    id:             d.id,
    descricao:      d.descricao,
    valor:          Number(d.valor),
    dataVencimento: d.dataVencimento.toISOString(),
    status:         d.status,
  }));

  return (
    <CalendarioClient
      parcelas={todasParcelas as any}
      clientes={clientes}
      despesas={todasDespesas}
    />
  );
}
