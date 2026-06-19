import { prisma } from '../src/lib/prisma';

async function mergeClientes(nomeFrom: string, nomeTo: string) {
  const fromClients = await prisma.cliente.findMany({ where: { nome: { equals: nomeFrom, mode: "insensitive" } } });
  const toClients = await prisma.cliente.findMany({ where: { nome: { equals: nomeTo, mode: "insensitive" } } });

  if (fromClients.length === 0) {
    console.log(`Cliente de origem não encontrado: ${nomeFrom}`);
    return;
  }
  if (toClients.length === 0) {
    console.log(`Cliente de destino não encontrado: ${nomeTo}`);
    return;
  }

  const fromClient = fromClients[0];
  const toClient = toClients[0];

  console.log(`Mesclando ${fromClient.nome} (ID: ${fromClient.id}) -> ${toClient.nome} (ID: ${toClient.id})`);

  // Move emprestimos
  await prisma.emprestimo.updateMany({
    where: { clienteId: fromClient.id },
    data: { clienteId: toClient.id }
  });

  // Delete fromClient
  await prisma.cliente.delete({
    where: { id: fromClient.id }
  });

  console.log(`Merge concluído para ${nomeFrom} -> ${nomeTo}`);
}

async function main() {
  console.log("Iniciando merge de clientes...");

  // Karla -> Karla (João)
  await mergeClientes("Karla", "Karla (João)");

  // Severina -> Severina (Esmeralda)
  await mergeClientes("Severina", "Severina (Esmeralda)");

  // Riquely -> Riquelly
  // We need to check which one exists or if both exist. 
  // Let's assume Riquely is from, Riquelly is to.
  const riquelys = await prisma.cliente.findMany({ where: { nome: { contains: "Riquel", mode: "insensitive" } } });
  console.log("Encontradas Riquelys:", riquelys.map(c => ({ id: c.id, nome: c.nome })));
  
  // If there is "Riquely" and "Riquelly", let's merge "Riquely" to "Riquelly"
  await mergeClientes("Riquely", "Riquelly");

  console.log("Finalizado!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
