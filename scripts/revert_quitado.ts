import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Revertendo contratos de QUITADO para ATIVO...");
  
  const atualizados = await prisma.emprestimo.updateMany({
    where: { status: "QUITADO" },
    data: { status: "ATIVO" }
  });

  console.log(`${atualizados.count} empréstimos foram revertidos para ATIVO.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
