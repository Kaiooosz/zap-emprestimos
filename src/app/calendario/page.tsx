import { prisma } from "@/lib/prisma";
import { CalendarioClient } from "@/components/calendario/CalendarioClient";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const hoje = new Date();

  // Marca atrasadas
  await prisma.parcela.updateMany({
    where: { status: "PENDENTE", dataVencimento: { lt: hoje } },
    data:  { status: "ATRASADO" },
  });

  const parcelas = await prisma.parcela.findMany({
    include: { emprestimo: { include: { cliente: { select: { id: true, nome: true, phone: true } } } } },
    orderBy: { dataVencimento: "asc" },
  });

  const clientes = await prisma.cliente.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  const todasParcelas = parcelas.map((p) => ({
    ...p,
    valorDevido:  Number(p.valorDevido),
    valorPago:    p.valorPago ? Number(p.valorPago) : undefined,
    clienteId:    p.emprestimo.cliente.id,
    clienteNome:  p.emprestimo.cliente.nome,
    clientePhone: p.emprestimo.cliente.phone,
  }));

  return (
    <CalendarioClient
      parcelas={todasParcelas as any}
      clientes={clientes}
    />
  );
}
