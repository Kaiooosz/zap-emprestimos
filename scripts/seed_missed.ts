import { prisma } from '../src/lib/prisma';
import { calcularEmprestimo } from '../src/lib/calculo/juros';

function parseDataBR(dataStr: string) {
  if (!dataStr) return new Date();
  const parts = dataStr.trim().split('/');
  if (parts.length < 3) return new Date();
  let [d, m, y] = parts;
  if (y.length === 2) {
    y = '20' + y;
  }
  return new Date(Number(y), Number(m) - 1, Number(d));
}

const missedData = [
  { 
    nome: "Raissa (Daniel)", 
    valorPrincipal: 2500, 
    taxaJuros: 160, 
    numParcelas: 10, 
    dataCompra: "5/1/26", 
    vencimento: "5/2/26",
    valorParcela: 650
  },
  { 
    nome: "Luana (Letícia)", 
    valorPrincipal: 6000, 
    taxaJuros: 75, 
    numParcelas: 4, 
    dataCompra: "8/6/26", 
    vencimento: "8/7/26",
    valorParcela: 2625
  }
];

async function main() {
  console.log("Iniciando insercao dos 2 contratos pendentes...");

  const admin = await prisma.user.findFirst({ where: { email: "zap@admin.com" }});
  if (!admin) throw new Error("Admin zap@admin.com nao encontrado!");

  let inseridos = 0;

  for (const item of missedData) {
    const cliente = await prisma.cliente.findFirst({
      where: { nome: item.nome },
    });

    if (!cliente) {
      console.log(`Cliente nao encontrado: ${item.nome}`);
      continue;
    }

    const dataInicio = parseDataBR(item.dataCompra);
    const dataVenc = parseDataBR(item.vencimento);

    const resultado = calcularEmprestimo(
      { valorPrincipal: item.valorPrincipal, taxaJuros: item.taxaJuros, numParcelas: item.numParcelas, tipo: "simples" },
      dataInicio,
      30
    );

    const vp        = resultado.valorParcela;
    const vjParcela = Math.round((resultado.totalJuros / item.numParcelas) * 100) / 100;
    const vpParcela = Math.round((resultado.valorPrincipal / item.numParcelas) * 100) / 100;

    await prisma.emprestimo.create({
      data: {
        clienteId: cliente.id,
        operadorId: admin.id,
        tipoProduto: "EMPRESTIMO",
        tipo: "MENSAL",
        modalidadeJuros: "SIMPLES",
        status: "ATIVO",
        valorPrincipal: resultado.valorPrincipal,
        taxaJuros: resultado.taxaJuros,
        totalJuros: resultado.totalJuros,
        valorTotal: resultado.valorTotal,
        numParcelas: item.numParcelas,
        dataInicio: dataInicio,
        dataVencimento: dataVenc,
        parcelas: {
          create: resultado.parcelas.map((p, i) => {
             const isLast = i === item.numParcelas - 1;
             const vencThis = new Date(dataVenc);
             vencThis.setMonth(vencThis.getMonth() + i);

             return {
              numero: i + 1,
              valorDevido:    isLast ? Math.round((resultado.valorTotal - vp * (item.numParcelas - 1)) * 100) / 100 : vp,
              valorPrincipal: isLast ? Math.round((resultado.valorPrincipal - vpParcela * (item.numParcelas - 1)) * 100) / 100 : vpParcela,
              valorJuros:     isLast ? Math.round((resultado.totalJuros - vjParcela * (item.numParcelas - 1)) * 100) / 100 : vjParcela,
              dataVencimento: vencThis,
              status: "PENDENTE"
            }
          })
        }
      }
    });

    console.log(`Contrato para ${item.nome} inserido com sucesso!`);
    inseridos++;
  }

  console.log(`Terminou. Inseridos: ${inseridos}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); process.exit(0); });
