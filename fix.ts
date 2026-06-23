import { PrismaClient } from "@prisma/client";
import { calcularEmprestimo } from "./src/lib/calculo/juros";
const prisma = new PrismaClient();

async function main() {
  const emprestimo = await prisma.emprestimo.findFirst({
    where: { id: { startsWith: "cmq" } },
    include: { parcelas: { orderBy: { numero: "asc" } } }
  });

  if (!emprestimo) return console.log("Not found");

  console.log("Before:", emprestimo.taxaJuros, emprestimo.totalJuros, emprestimo.valorTotal);

  // Recalculate
  const tipoCalc = emprestimo.modalidadeJuros === "POR_PARCELA" ? "por_parcela" : "simples";
  const resultado = calcularEmprestimo({
    valorPrincipal: Number(emprestimo.valorPrincipal),
    taxaJuros: Number(emprestimo.taxaJuros), // 45
    numParcelas: emprestimo.numParcelas,
    tipo: tipoCalc
  }, new Date(emprestimo.dataInicio), 30);

  console.log("New Total Juros:", resultado.totalJuros);
  console.log("New Valor Total:", resultado.valorTotal);

  const vp = resultado.valorParcela;
  const vjParcela = Math.round((resultado.totalJuros / resultado.numParcelas) * 100) / 100;
  const vpParcela = Math.round((resultado.valorPrincipal / resultado.numParcelas) * 100) / 100;

  // Update DB
  await prisma.$transaction(async (tx) => {
    await tx.emprestimo.update({
      where: { id: emprestimo.id },
      data: {
        totalJuros: resultado.totalJuros,
        valorTotal: resultado.valorTotal,
      }
    });

    for (let i = 0; i < emprestimo.parcelas.length; i++) {
      const p = emprestimo.parcelas[i];
      const isLast = i === emprestimo.numParcelas - 1;
      
      const pValorDevido = isLast ? Math.round((resultado.valorTotal - vp * (resultado.numParcelas - 1)) * 100) / 100 : vp;
      const pValorPrincipal = isLast ? Math.round((resultado.valorPrincipal - vpParcela * (resultado.numParcelas - 1)) * 100) / 100 : vpParcela;
      const pValorJuros = isLast ? Math.round((resultado.totalJuros - vjParcela * (resultado.numParcelas - 1)) * 100) / 100 : vjParcela;

      await tx.parcela.update({
        where: { id: p.id },
        data: {
          valorDevido: pValorDevido,
          valorPrincipal: pValorPrincipal,
          valorJuros: pValorJuros
        }
      });
    }
  });

  console.log("Fixed!");
}
main();
