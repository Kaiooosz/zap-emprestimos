import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Fixing dataPagamento for paid parcels...");
  
  const parcelas = await prisma.parcela.findMany({
    where: { status: "PAGO", dataPagamento: null }
  });

  console.log(`Found ${parcelas.length} parcels to fix.`);

  let atualizadas = 0;
  for (const p of parcelas) {
    await prisma.parcela.update({
      where: { id: p.id },
      data: {
        dataPagamento: p.dataVencimento
      }
    });
    atualizadas++;
  }

  console.log(`Sucesso! ${atualizadas} parcelas foram fixadas.`);
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
