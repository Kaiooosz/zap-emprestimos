import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Iniciando marcacao de parcelas antigas como PAGO...");
  
  const hoje = new Date();
  // Zera hora para comparar apenas datas, ou usa a hora atual. Vamos considerar < hoje.
  
  // 1. Encontra todas as parcelas que venceram antes de ou no dia de hoje e não estão pagas
  const parcelasAtrasadas = await prisma.parcela.findMany({
    where: {
      dataVencimento: {
        lte: hoje // less than or equal to now
      },
      status: {
        not: "PAGO"
      }
    },
    include: {
      emprestimo: true
    }
  });

  console.log(`Encontradas ${parcelasAtrasadas.length} parcelas vencidas/atrasadas. Atualizando...`);

  let atualizadas = 0;
  for (const p of parcelasAtrasadas) {
    await prisma.parcela.update({
      where: { id: p.id },
      data: {
        status: "PAGO",
        valorPago: p.valorDevido,
        // Opcional: criar uma transação no fluxo de caixa para essas baixas? 
        // O usuário disse "coloque que foi pago conforme as datas até a data de hoje",
        // Vamos apenas setar como pago para limpar os atrasos na base.
      }
    });
    atualizadas++;
  }

  // 2. Atualizar status dos Empréstimos se todas as parcelas estiverem pagas
  const emprestimosAfetadosIds = [...new Set(parcelasAtrasadas.map(p => p.emprestimoId))];
  let quitados = 0;

  for (const empId of emprestimosAfetadosIds) {
    const pendentes = await prisma.parcela.count({
      where: {
        emprestimoId: empId,
        status: { not: "PAGO" }
      }
    });

    if (pendentes === 0) {
      await prisma.emprestimo.update({
        where: { id: empId },
        data: { status: "QUITADO" }
      });
      quitados++;
    }
  }

  console.log(`Sucesso! ${atualizadas} parcelas foram marcadas como pagas.`);
  console.log(`${quitados} empréstimos foram quitados integralmente.`);
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
