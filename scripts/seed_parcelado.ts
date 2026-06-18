import { prisma } from '../src/lib/prisma';
import { calcularEmprestimo } from '../src/lib/calculo/juros';

const rawData = `Nome	Valor empréstimo 	Data compra	1 vencimento	Porcentagem	A receber	Saldo devedor firma	Valor que volta na parcela	Lucro por parcela
Fatima	6.000	17/3/25	17/4/25	150	15 x 1.000	400	400	600
Suzane	1.000	7/5/25	7/6/25	117	7 x 310	290	145	165
Mel	5.000	1/9/25	1/10/25	159.5	15 x 865	2.345	335	530
Silmara (Silvana)	6.000	2/9/25	2/10/25	160	15 x 1.040	3.200	400	640
Gleice	12.000	1/9/25	1/10/25	160	24 x 1.300	7.500	500	800
Adriana (Sandra)	1.750	1/9/25	1/10/25	304.8	13 x 545	540	135	410
Joao (Degu)	1.500	6/9/25	6/10/25	70.6	4 x 640	375	375	265
Silvana (Patricia)	8.000	8/9/25	8/10/25	181.25	15 x 1.500	2.675	535	965
Silvana (Patricia)	2.000	24/9/25	24/10/25	145.25	9 x 545	675	225	320
Diego (Nê)	10.000	29/9/25	29/10/25	170	18 x 1.500	6.105	555	945
Mel	9.000	13/10/25	13/11/25	131.1	8 x 2.600	1.140	1.140	1.460
Giovana (Ana/Karina)	2.000	12/10/25	12/11/25	130	8 x 575	1.250	250	325
Adriana (Giane)	2.000	24/10/25	24/11/25	40	2 x 1.400	2.000	2.000	600 (mensal)
Fabio	5.000	25/10/25	25/11/25	160	10 x 1.300	1.500	500	800
Jose (Nê)	4.000	16/11/25	16/12/25	160	8 x 1.300	1.000	500	800
Luana (Jessica)	3.200	20/12/25	20/1/26	160.9	10 x 835	1.280	320	515
Ione	2.800	4/12/25	5/1/26	160.7	10 x 730	1.120	280	450
Talita (Andréia/G.M.)	1.800	5/12/25	5/1/26	155.5	10 x 460	720	180	280
Riquelly	800	6/12/25	6/1/26	40	2 x 560	800	800	240 (mensal)
Caroline (Patricia)	2.000	13/12/25	13/1/26	101	6 x 670	670	335	335
Rafael (Concept)	5.000	16/12/25	16/1/26	160	10 x 1.300	2.500	500	800
Giovana (Natália)	1.500	16/12/25	16/1/26	156.6	10 x 385	750	150	235
Andreia (G.M.)	1.000	19/12/25	19/1/25	160	10 x 260	400	100	160
Dê	5.000	19/12/25	19/1/25	40	2 x 3.500	3.000	3.000	600 (mensal)
Nê	5.000	20/12/25	20/1/26	160	10 x 1.300	2.500	500	800
Elaine (Luciane)	2.500	24/12/25	24/1/26	115.6	7 x 770	720	360	410
Raissa	2.500	5/1/26	5/2/26	160	10 x 650	1.250	250	400
Gustavo (Esmeralda)	2.000	5/1/26	5/2/26	40	2 x 1.400	1.500	1.500	0
Leticia (Jessica)	1.500	10/1/26	10/2/26	160	10 x 390	750	150	240
Glaucia (Lucas)	3.000	30/1/26	28/2/26	100	6 x 1.000	500	500	500
Lucas	3.000	23/1/26	23/2/26	120.5	7 x 945	1.290	430	515
Rosana (Karina)	3.000	2/2/26	2/3/26	90	5 x 1.140	1.800	600	540
Thaina (Letícia)	2.500	3/2/26	3/3/26	90	5 x 950	500	500	450
Graziella (Gustavo)	1.000	5/2/26	5/3/26	165	10 x 265	600	100	165
Cauê (Yasmim)	1.500	7/2/26	7/3/26	90	5 x 570	300	300	270
Cristiane (Fátima)	2.000	9/2/26	9/3/26	105.5	6 x 685	670	335	350
Camila (Luciane)	3.500	16/2/26	16/3/26	104.8	6 x 1.195	1.755	585	610
Gabriel (Sandra)	3.000	16/2/26	16/3/26	105	6 x 1.025	1.500	500	525
Henrique (David primo)	4.000	16/2/26	16/3/26	165	10 x 1.060	2.400	400	660
Giovane	5.000	5/2/26	5/3/26	75	3 x 2.190	1.250	1.250	940
Mel	5.000	18/2/26	18/3/26	165	10 x 1.325	4.000	500	825
Alzira	1.200	21/2/26	21/3/26	75	4 x 525	300	300	225
Inês (Michele)	1.500	23/2/26	23/3/26	76	4 x 660	750	375	285
Alessandro (Carolina)	2.000	25/2/26	25/3/26	149.7	9 x 555	1.350	225	330
Thabata (Igor)	2.300	26/2/26	26/3/26	104.7	6 x 785	1.540	385	400
Tila (Luciane)	3.000	28/2/26	28/3/26	120.5	7 x 945	1.720	430	515
Adriana (Joice)	1.200	5/3/26	5/4/26	75	4 x 525	600	300	225
Karina	1.100	2/3/26	2/4/26	104.5	6 x 375	555	185	190
Nubia (Leticia)	3.000	2/3/26	2/4/26	90	5 x 1.140	1.200	600	540
Karine	15.000	3/3/26	3/4/26	30	2 x 9.750	10.000	10.000	1500 (mensal)
Jorcleane	1.500	7/3/26	7/4/26	90	5 x 570	600	300	270
Karla (João)	1.000	9/3/26	9/4/26	90	5 x 380	400	200	180
Esmeralda (Luciane)	2.000	9/3/26	9/4/26	105.5	6 x 685	1.005	335	350
Adriana (Sandra)	1.000	20/3/26	20/4/26	76	4 x 440	500	250	190
Debora (Giovana)	1.300	25/3/25	25/4/26	105.3	6 x 445	880	880	225
Fabio	5.000	25/3/25	25/4/26	160	10 x 1.300	4.000	500	800
Robson (Raissa)	3.000	28/3/26	30/4/26	165	10 x 795	2.400	300	495
Renata	1.000	31/3/26	28/4/26	76	4 x 440	500	250	190
Michele	1.200	31/3/26	30/4/26	45	2 x 870	600	600	270
Leonardo (Camila)	3.000	7/4/26	7/5/26	75.3	4 x 1.315	1.500	750	565
Leomara (Lalau)	1.200	9/4/26	9/5/26	60	3 x 640	400	400	240
Gê	2.700	9/4/26	9/5/26	164.8	10 x 715	2.430	270	445
Rai (Cristiane)	1.500	9/4/26	9/5/26	106	6 x 515	1.000	250	265
Kauan (David primo)	1.000	13/4/26	13/5/26	60.5	3 x 535	335	335	200
Thayrone	5.000	15/4/26	15/5/26	60.2	3 x 2.670	1.670	1.670	1.000
Kethy (Sisleide)	5.000	30/4/26	30/5/26	120.5	7 x 1.575	4.290	715	860
Luciane	8.875	8/4/26	8/5/26	127	1 x 6.875	6.875	1.500	0
Camila (Cauê)	1.100	17/4/26	17/5/26	59.5	3 x 585	370	370	215
Silvana (Samira)	1.950	21/4/26	21/5/26	187.1	7 x 800	1.680	280	445
Luiz Felipe	1.000	22/4/26	22/5/26	76	4 x 440	1.000	250	190
Alzira	2.000	30/4/26	30/5/26	120.5	7 x 630	1.710	285	345
Rian (Sisleide)	2.000	28/4/26	28/5/26	136	8 x 590	1.750	250	340
Wesley (Giovane)	1.000	5/4/26	5/5/26	76	4 x 440	500	250	190
Igor	1.500	7/5/26	7/6/26	40	2 x 1.050	750	750	300
Fátima (Luciane)	2.500	8/5/26	5/6/26	166	10 x 665	2.250	250	415
Fabiana (Jhonatan)	840	30/4/26	31/5/26	160	4 x 546	630	210	336
Thaís (Daniela)	1.000	8/5/26	8/6/26	165	10 x 265	900	100	165
Pastora (Lalau)	1.000	15/5/26	15/6/26	90	5 x 380	800	200	180
Karina	900	10/5/25	10/6/26	45.5	2 x 655	450	450	205
Caroline (Thabata)	2.100	12/5/26	12/6/26	120	7 x 660	1.800	300	360
Cláudio (João/Sandra)	1.500	13/5/26	13/6/26	152	9 x 420	1.360	170	250
Levi	1.000	30/4/26	30/5/26	90	5 x 380	800	200	180
Rosângela 	3.500	15/5/26	15/6/26	120	7 x 1.100	3.500	500	600
Luana (Letícia)	1.800	15/5/26	15/6/26	60	3 x 960	1.200	600	360
Marcio Ar.	5.400	20/5/26	20/6/26	60	3 x 2.880	5.400	1.800	1.080
Adriana (Joice)	1.500	21/5/26	21/6/26	76	4 x 660	1.500	375	660
Mãe (Degu)	1.000	23/5/26	23/6/26	45	2 x 725	1.000	500	225
Letícia (Giovana)	1.300	23/5/26	23/6/26	133.8	8 x 380	1.320	165	215
Mayara (Filha Fábio)	3.500	25/3/26	25/6/26	90	5 x 1.330	3.500	700	630
Patricia (Lalau)	5.000	30/5/26	30/6/26	135.2	8 x 1.470	5.000	625	845
Pedro Henrique	7.000	27/5/26	27/6/26	85	5 x 2.590	7.000	1.400	1.190
Juliana	3.000	30/5/26	30/6/26	60	3 x 1.600	3.000	1.000	600
Patrícia (Esmeralda)	2.000	3/6/26	3/7/26	105.5	6 x 685	2.010	335	350
Leticia (Tila)	3.000	6/6/26	6/7/26	105	6 x 1.025	3.000	500	525
Vera	1.200	15/6/26	15/7/26	75	4 x 525	1.200	300	225
Luana (Leticia)	6.000	8/6/26	8/7/26	75	4 x 2.625	6.000	1.500	1.125
Cauê (Yasmim)	1.300	9/6/26	9/7/26	133.8	8 x 380	1.320	165	215
Claudio Brunis	5.000	10/6/26	10/7/26	60.2	3 x 2.670	5.010	1.670	1.000
Beatriz (Raphael)	2.000	11/6/26	11/7/26	75	4 x 875	2.000	500	375
Janaina (Rick)	1.000	13/6/26	13/7/26	45	2 x 725	1.000	500	225
Sandra (Lalau)	1.200	15/6/26	15/7/26	75	4 x 525	1.200	300	225
Stephany	900	20/6/26	20/7/26	45	2 x 652.5	900	450	202.5`;

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
  console.log("Iniciando insercao de emprestimos parcelados...");

  const clientes = await prisma.cliente.findMany();
  const mapClientes = new Map<string, string>();
  for (const c of clientes) {
    mapClientes.set(c.nome.toLowerCase().trim(), c.id);
  }

  const admin = await prisma.user.findFirst({ where: { email: "zap@admin.com" }});
  if (!admin) throw new Error("Admin zap@admin.com nao encontrado!");

  const linhas = rawData.split('\n').slice(1);
  let inseridos = 0;
  let ignorados = 0;

  for (const linha of linhas) {
    if (!linha.trim()) continue;
    const cols = linha.split('\t');
    if (cols.length < 6) continue;
    
    // Nome	Valor empréstimo	Data compra	1 vencimento	Porcentagem	A receber
    let [nomeRaw, valorRaw, dataCompra, vencimento, porcentagemRaw, aReceberRaw] = cols;
    
    const nome = nomeRaw.trim();
    const valorPrincipal = Number(valorRaw.replace(/\./g, '').replace(',', '.'));
    
    // Parse numParcelas from "A receber" -> "15 x 1.000" -> 15
    let numParcelas = 1;
    let valorParcela = 0;
    if (aReceberRaw && aReceberRaw.includes('x')) {
      const parts = aReceberRaw.split('x');
      numParcelas = parseInt(parts[0].trim());
      valorParcela = Number(parts[1].replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''));
    } else {
      // Falha? Assume 1
    }

    if (!numParcelas || isNaN(numParcelas)) numParcelas = 1;

    // A taxa de juros no caso parcelado pode ser tratada como a taxa total FLAT ("simples")
    // Se "A receber" é 15 x 1000 = 15000 e principal é 6000, Juros = 9000 -> Taxa Total = 9000/6000 = 150%
    // Então passamos taxaJuros = 150 e tipo = "simples" para o motor, e ele calcula certinho.
    let taxaJuros = 0;
    if (valorParcela > 0) {
      const totalPagar = valorParcela * numParcelas;
      const totalJuros = totalPagar - valorPrincipal;
      taxaJuros = (totalJuros / valorPrincipal) * 100;
    } else {
      taxaJuros = Number(porcentagemRaw.replace(/\./g, '').replace(',', '.'));
    }

    const dataInicio = parseDataBR(dataCompra);

    const clienteId = mapClientes.get(nome.toLowerCase());
    if (!clienteId) {
      console.log(`Cliente nao encontrado: ${nome}`);
      ignorados++;
      continue;
    }

    const resultado = calcularEmprestimo(
      { valorPrincipal, taxaJuros, numParcelas, tipo: "simples" },
      dataInicio,
      30
    );

    const dataVenc  = parseDataBR(vencimento);

    const vp        = resultado.valorParcela;
    const vjParcela = Math.round((resultado.totalJuros / numParcelas) * 100) / 100;
    const vpParcela = Math.round((resultado.valorPrincipal / numParcelas) * 100) / 100;

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
        numParcelas: numParcelas,
        dataInicio: dataInicio,
        dataVencimento: dataVenc, // Essa é a dataVenc da ÚLTIMA parcela na vdd, ou da 1a. Vamos usar a lógica normal do sistema
        parcelas: {
          create: resultado.parcelas.map((p, i) => {
             const isLast = i === numParcelas - 1;
             
             // A data de vencimento da primeira parcela é `dataVenc`.
             // As próximas são +30 dias.
             const vencThis = new Date(dataVenc);
             vencThis.setMonth(vencThis.getMonth() + i);

             return {
              numero: i + 1,
              valorDevido:    isLast ? Math.round((resultado.valorTotal - vp * (numParcelas - 1)) * 100) / 100 : vp,
              valorPrincipal: isLast ? Math.round((resultado.valorPrincipal - vpParcela * (numParcelas - 1)) * 100) / 100 : vpParcela,
              valorJuros:     isLast ? Math.round((resultado.totalJuros - vjParcela * (numParcelas - 1)) * 100) / 100 : vjParcela,
              dataVencimento: vencThis,
              status: "PENDENTE"
            }
          })
        }
      }
    });

    inseridos++;
  }

  console.log(`Terminou. Inseridos: ${inseridos}, Ignorados por nome: ${ignorados}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); process.exit(0); });
