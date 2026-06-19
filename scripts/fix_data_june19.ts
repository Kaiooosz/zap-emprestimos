import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Iniciando correções de dados - 19/Jun/26...");

  // 1. Mudar clientes para MENSAL
  const clientesMensal = [
    "Adriana (Giane)",
    "Riquely",
    "Dê",
    "Gustavo (Esmeralda)",
    "Karine"
  ];
  for (const nome of clientesMensal) {
    const clientes = await prisma.cliente.findMany({ where: { nome: { contains: nome, mode: "insensitive" } } });
    for (const c of clientes) {
      const emprestimos = await prisma.emprestimo.findMany({ where: { clienteId: c.id, status: "ATIVO" } });
      for (const e of emprestimos) {
        await prisma.emprestimo.update({
          where: { id: e.id },
          data: { tipo: "MENSAL" }
        });
        console.log(`- Alterado para MENSAL: ${c.nome}`);
      }
    }
  }

  // 2. Quitar (18/06/2026)
  // Alessandra: 500$ / juros 50$ (cobrado por 7 dias)
  // Osiel (Lalau): 400$ / juros 120$
  // Wanessa: 1.000$ / juros 300$
  const quitacoes = [
    { nome: "Alessandra", principal: 500, juros: 50 },
    { nome: "Osiel (Lalau)", principal: 400, juros: 120 },
    { nome: "Wanessa", principal: 1000, juros: 300 }
  ];

  for (const q of quitacoes) {
    const clientes = await prisma.cliente.findMany({ where: { nome: { contains: q.nome, mode: "insensitive" } } });
    for (const c of clientes) {
      const emprestimos = await prisma.emprestimo.findMany({ where: { clienteId: c.id, status: "ATIVO" }, include: { parcelas: true } });
      for (const e of emprestimos) {
        // Encontrar parcela ativa
        const parcelas = e.parcelas.filter(p => ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status));
        for (const p of parcelas) {
          await prisma.parcela.update({
            where: { id: p.id },
            data: { 
              status: "PAGO", 
              dataPagamento: new Date("2026-06-18T12:00:00.000Z"),
              valorPago: Number(p.valorDevido) // Assuming they paid exactly what was due
            }
          });
        }
        await prisma.emprestimo.update({
          where: { id: e.id },
          data: { status: "QUITADO" }
        });
        console.log(`- Quitado: ${c.nome} - Principal: ${q.principal}`);
      }
    }
  }

  // 3. Arrumar porcentagens
  // Stephany para 45% (está 1.350%)
  // Giovane para 75% (está 31.4%)
  const taxas = [
    { nome: "Stephany", taxa: 45 },
    { nome: "Giovane", taxa: 75 }
  ];
  for (const t of taxas) {
    const clientes = await prisma.cliente.findMany({ where: { nome: { contains: t.nome, mode: "insensitive" } } });
    for (const c of clientes) {
      const emprestimos = await prisma.emprestimo.findMany({ where: { clienteId: c.id, status: "ATIVO" } });
      for (const e of emprestimos) {
        await prisma.emprestimo.update({
          where: { id: e.id },
          data: { taxaJuros: t.taxa }
        });
        console.log(`- Taxa alterada para ${t.taxa}%: ${c.nome}`);
      }
    }
  }

  console.log("Correções finalizadas!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
