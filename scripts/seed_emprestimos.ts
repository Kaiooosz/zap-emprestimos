import { prisma } from '../src/lib/prisma';
import { calcularEmprestimo } from '../src/lib/calculo/juros';

const rawData = `Nome	Valor	Dara de compra	Vencimento	Porcentagem	A receber 
Gilmar	1.000	13/1/23	13/2/23	20	200
Rodolfo (Leo)	500	18/8/23	18/9/23	30	150
Karin	1.000	2/10/23	2/11/23	25	250
Leonardo (Lucas)	500	22/12/23	22/1/24	30	150
Wiskey (Leo)	500	18/3/24	18/4/24	30	150
Eliene (Gabriel)	1.000	20/3/24	20/4/24	30	300
Gisele	500	8/5/24	8/6/24	20	100
Leko (Leo)	500	29/6/24	29/7/24	30	150
Paulinho (Leo)	1.000	2/7/24	2/8/24	30	300
Raissa (Daniel)	200	9/2/25	9/3/25	30	60
Camila (Dê)	450	7/3/25	7/4/25	20	90
Amigo Thony (Charles)	500	19/3/25	19/4/25	30	150
Natalia (Luciane)	1.600	22/3/25	22/4/25	30	480
Luana (Lucas)	800	5/6/25	5/7/25	30	240
Sara (Maicon)	1.000	12/6/25	12/7/25	20	200
Indio	400	13/6/25	13/7/25	25	100
Jean (Degu)	500	22/6/25	22/7/25	30	150
Giane (Luciane)	2.500	26/6/25	26/7/25	30	750
Thony (Charles)	1.000	9/7/25	9/8/25	30	300
Lucas (Dê)	700	30/7/25	30/8/25	20	140
Magrao 	1.000	22/8/25	22/9/25	30	300
Severina (Esmeralda)	1.900	5/9/25	5/10/25	20	380
Lucas Sonata	2.200	20/9/25	20/10/25	20	440
Bruno (Lucas)	500	10/9/25	10/10/25	30	150
Magrao 	500	17/9/25	17/10/25	30	150
Ariane (David primo)	800	17/9/25	17/10/25	30	240
Jessica (Lucas)	300	22/10/25	22/11/25	30	0
Joao (Degu)	400	6/11/25	6/12/25	30	120
Jessica (Lucas)	1.000	6/11/25	6/12/25	30	0
Gustavo (Lucas A.)	400	8/11/25	8/12/25	30	120
Anderson (Nê)	1.320	11/11/25	11/12/25	30	396
Sandra (Gê)	493	25/11/25	25/12/25	30	148
Lucas Vinicius	300	5/12/25	5/1/26	30	90
Levi	350	10/12/25	10/1/26	30	105
Katia (Lalau)	1.000	10/12/25	10/1/26	30	300
Vera	600	29/12/25	29/1/26	30	180
Karla	400	9/1/26	9/2/26	30	120
Natalia (Luciane)	800	9/1/26	9/2/26	30	240
Wesley (Wagner)	1.000	16/1/26	16/2/26	20	200
Viviane	595	19/1/26	19/2/26	30	178,5
Philips (Bigula)	2.000	22/1/26	22/2/26	20	400
Julia (Natália)	2.300	24/1/26	24/2/26	30	690
Rick	817	27/1/26	27/2/26	30	245
Robson (Raissa)	500	27/1/26	27/2/26	30	150
Gabriel (100 confusão)	370	3/2/26	3/3/26	30	111
Nê	1.000	12/2/26	12/3/26	30	300
Denise	300	20/2/26	20/3/26	30	90
Francisco (Maicon)	1.000	21/2/26	21/3/26	20	200
Pimentinha (David primo)	1.000	21/2/26	21/3/26	30	300
Diogo	2.000	1/3/26	1/4/26	20	400
Edson	1.500	4/3/26	4/4/26	30	450
Luiz	500	7/3/26	7/4/26	30	150
Lucas Vinicius	350	8/3/26	8/4/26	30	105
Leonardo (G.M.)	550	10/3/26	10/4/26	30	165
Ana (Julia)	400	13/3/26	13/4/26	30	120
Luiz Felipe	700	18/3/26	18/4/26	30	210
Tamires (Degu)	850	24/3/26	24/4/26	30	255
Célia (David primo)	850	25/3/26	25/4/26	30	255
Ana Paula	160	25/3/26	25/4/26	30	48
Ana (Balbinos)	610	25/3/26	25/4/26	30	183
Natalia (Luciane)	900	25/3/26	25/4/26	30	270
Guilherme (David primo)	1.000	30/3/26	30/4/26	30	300
Vinicius (Charles)	500	10/4/26	10/5/26	30	150
Adriana (Joice)	500	10/4/26	10/5/26	30	150
Kaio	10.000	10/4/26	10/5/26	20	0
Luan	1.000	14/4/26	14/5/26	30	300
Ana Paula 	300	14/4/26	14/5/26	30	90
Cristiane (Fátima)	1000	16/4/26	16/4/26	30	300
Camily	600	16/4/26	16/4/26	30	180
Cristiane (Thayrone)	800	20/4/26	20/5/26	30	240
Cauê (Yasmim)	800	25/4/26	25/5/26	30	240
Luiz	300	25/4/26	25/5/26	30	90
Jair	1.000	25/4/26	25/5/26	20	200
Rosana Uyeno	600	30/4/26	30/5/26	30	180
Michele	500	2/5/26	2/6/26	30	150
Pedro	200	5/5/26	5/6/26	30	60
Rosana Uyeno	300	13/5/26	13/6/26	30	90
Roberto	650	10/5/26	10/6/26	30	195
Daniely (Denise)	400	11/5/26	11/6/26	30	120
Severina	600	11/5/26	11/6/26	30	180
Michele	400	10/5/26	10/6/26	30	120
Gê	400	16/5/26	16/6/26	30	120
Osiel (Lalau)	400	18/5/26	18/6/26	30	120
Wanessa (Severina)	1.000	18/5/26	18/6/26	30	300
Gustavo (Thayrone)	1.000	19/5/26	19/6/26	30	300
Riquely	200	20/5/26	20/6/26	30	60
Rita de Cássia	500	21/5/26	21/5/26	30	150
Levi	350	21/5/26	21/5/26	30	105
Lucas A.	500	22/5/26	22/6/26	30	150
Luiz	300	23/5/26	23/5/26	30	90
Eduardo	300	22/5/26	22/6/26	30	90
Lucas Vinicius	150	23/5/26	23/5/26	30	45
Nê	1.300	27/5/26	27/6/26	30	390
Sandra Brunis	250	28/5/26	28/6/26	30	75
Lucas A.	500	29/5/26	29/6/26	30	150
Geovana (David primo)	900	30/5/26	30/6/26	30	270
Beatriz (David primo)	850	30/5/26	30/6/26	30	255
Fátima (Elaine)	500	1/6/26	1/7/26	30	150
Fabio	1.000	2/6/26	2/7/26	30	300
Thayrone	1.000	2/6/26	2/7/26	30	300
Edvaldo	200	5/6/26	5/7/26	30	60
Ruan (Gabriel/100 confusão)	520	5/6/26	5/7/26	30	156
Lucas A.	700	6/6/26	6/7/26	30	210
Marlene 	1000	8/6/26	8/7/26	30	300
Luiz	700	9/6/26	9/7/26	30	210
Andressa 	200	9/6/26	9/7/26	30	60
Cliente (Dê)	2000	9/6/26	9/7/26	20	400
Edson	500	9/6/26	9/7/26	30	150
Degu	300	11/6/26	11/7/26	25	75
Alessandra	500	11/6/26	11/7/26	30	150
Mª Fatima (Natalia/Luciane)	2.000	12/6/26	12/7/26	30	600
Tiago (100 confusão)	150	12/6/26	12/7/26	30	45
Simone (Polianna)	400	15/6/26	15/7/26	30	120
Juliana (Lalau)	500	16/6/26	16/7/26	30	150
Jô Maria	500	17/6/26	17/7/26	30	150
Yuri (David primo)	700	17/6/26	17/7/26	30	210`;

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

async function main() {
  console.log("Iniciando insercao de emprestimos mensais...");

  // Buscar todos clientes e por num map
  const clientes = await prisma.cliente.findMany();
  const mapClientes = new Map<string, string>();
  for (const c of clientes) {
    mapClientes.set(c.nome.toLowerCase().trim(), c.id);
  }

  const admin = await prisma.user.findFirst({ where: { email: "zap@admin.com" }});
  if (!admin) throw new Error("Admin zap@admin.com nao encontrado!");

  const linhas = rawData.split('\n').slice(1); // Pular cabeçalho
  let inseridos = 0;
  let ignorados = 0;

  for (const linha of linhas) {
    if (!linha.trim()) continue;
    const cols = linha.split('\t');
    if (cols.length < 5) continue;
    
    // Nome	Valor	Dara de compra	Vencimento	Porcentagem	A receber
    let [nomeRaw, valorRaw, dataCompra, vencimento, porcentagemRaw, aReceberRaw] = cols;
    
    const nome = nomeRaw.trim();
    const valorPrincipal = Number(valorRaw.replace(/\./g, '').replace(',', '.'));
    const taxaJuros = Number(porcentagemRaw.replace(/\./g, '').replace(',', '.'));
    const dataInicio = parseDataBR(dataCompra);

    const clienteId = mapClientes.get(nome.toLowerCase());
    if (!clienteId) {
      console.log(`Cliente nao encontrado: ${nome}`);
      ignorados++;
      continue;
    }

    // Calcula
    const resultado = calcularEmprestimo(
      { valorPrincipal, taxaJuros, numParcelas: 1, tipo: "simples" },
      dataInicio,
      30
    );

    const dataVenc  = parseDataBR(vencimento);
    const vp        = resultado.valorParcela;
    const vjParcela = Math.round((resultado.totalJuros) * 100) / 100;
    const vpParcela = Math.round((resultado.valorPrincipal) * 100) / 100;

    await prisma.emprestimo.create({
      data: {
        clienteId,
        operadorId: admin.id,
        tipoProduto: "EMPRESTIMO",
        tipo: "MENSAL",
        modalidadeJuros: "SIMPLES",
        status: "ATIVO",
        valorPrincipal: resultado.valorPrincipal,
        taxaJuros: resultado.taxaJuros,
        totalJuros: resultado.totalJuros,
        valorTotal: resultado.valorTotal,
        numParcelas: 1,
        dataInicio: dataInicio,
        dataVencimento: dataVenc,
        parcelas: {
          create: [{
            numero: 1,
            valorDevido: vp,
            valorPrincipal: vpParcela,
            valorJuros: vjParcela,
            dataVencimento: dataVenc,
            status: "PENDENTE"
          }]
        }
      }
    });

    inseridos++;
  }

  console.log(`Terminou. Inseridos: ${inseridos}, Ignorados por nome: ${ignorados}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); process.exit(0); });
