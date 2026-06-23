const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emprestimos = await prisma.emprestimo.findMany({
    where: { id: { startsWith: "cmqjuh" } },
    include: { parcelas: { orderBy: { numero: "asc" } } }
  });
  if (emprestimos.length === 0) return console.log("Not found");
  
  const e = emprestimos[0];
  const numParcelas = e.numParcelas;
  const valorPrincipal = Number(e.valorPrincipal);
  const r = 0.45; // 45%
  const totalJuros = valorPrincipal * r; // 405
  const valorTotal = valorPrincipal + totalJuros; // 1305
  const parcela = valorTotal / numParcelas; // 652.5
  
  const vpParcela = Math.round((valorPrincipal / numParcelas)*100)/100;
  const vjParcela = Math.round((totalJuros / numParcelas)*100)/100;

  await prisma.emprestimo.update({
    where: { id: e.id },
    data: {
      totalJuros: totalJuros,
      valorTotal: valorTotal,
      modalidadeJuros: "SIMPLES"
    }
  });

  for (let i=0; i<numParcelas; i++) {
    const isLast = i === numParcelas - 1;
    const pValorDevido = isLast ? Math.round((valorTotal - parcela * (numParcelas - 1))*100)/100 : parcela;
    const pValorPrincipal = isLast ? Math.round((valorPrincipal - vpParcela * (numParcelas - 1))*100)/100 : vpParcela;
    const pValorJuros = isLast ? Math.round((totalJuros - vjParcela * (numParcelas - 1))*100)/100 : vjParcela;
    
    await prisma.parcela.update({
      where: { id: e.parcelas[i].id },
      data: {
        valorDevido: pValorDevido,
        valorPrincipal: pValorPrincipal,
        valorJuros: pValorJuros
      }
    });
  }
  console.log("Done");
}
main();
