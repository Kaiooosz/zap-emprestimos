// Motor de cálculo financeiro — Zap Empréstimos
// Modalidades: Simples, Composto, Price/SAC, Diário

export type TipoCalculo = "simples" | "por_parcela" | "composto" | "price";

export interface ParamsEmprestimo {
  valorPrincipal: number;
  taxaJuros: number;       // % por período (mensal, diário, etc.)
  numParcelas: number;
  tipo: TipoCalculo;
}

export interface ParcelaSimulada {
  numero: number;
  valorDevido: number;
  valorPrincipal: number;
  valorJuros: number;
  saldoDevedor: number;
  dataVencimento: Date;
}

export interface ResultadoEmprestimo {
  valorPrincipal: number;
  taxaJuros: number;
  totalJuros: number;
  valorTotal: number;
  valorParcela: number;
  numParcelas: number;
  parcelas: ParcelaSimulada[];
}

// ─── Cálculo de parcelas ──────────────────────────────────────────────────────

export function calcularEmprestimo(
  params: ParamsEmprestimo,
  dataInicio: Date,
  intervaloEmDias: number = 30
): ResultadoEmprestimo {
  const { valorPrincipal, taxaJuros, numParcelas, tipo } = params;
  const r = taxaJuros / 100;

  let totalJuros: number;
  let valorTotal: number;
  let parcelas: ParcelaSimulada[];

  if (tipo === "price") {
    // Tabela Price — parcelas iguais
    const parcela = r === 0
      ? valorPrincipal / numParcelas
      : (valorPrincipal * r * Math.pow(1 + r, numParcelas)) / (Math.pow(1 + r, numParcelas) - 1);

    valorTotal  = parcela * numParcelas;
    totalJuros  = valorTotal - valorPrincipal;

    let saldo = valorPrincipal;
    parcelas = Array.from({ length: numParcelas }, (_, i) => {
      const juros = saldo * r;
      const amort = parcela - juros;
      saldo = Math.max(0, saldo - amort);
      const venc = new Date(dataInicio);
      venc.setDate(venc.getDate() + intervaloEmDias * (i + 1));
      return {
        numero: i + 1,
        valorDevido: arred(parcela),
        valorPrincipal: arred(amort),
        valorJuros: arred(juros),
        saldoDevedor: arred(saldo),
        dataVencimento: venc,
      };
    });
  } else if (tipo === "composto") {
    // Juros compostos
    valorTotal = valorPrincipal * Math.pow(1 + r, numParcelas);
    totalJuros = valorTotal - valorPrincipal;
    const parcela = valorTotal / numParcelas;

    parcelas = Array.from({ length: numParcelas }, (_, i) => {
      const venc = new Date(dataInicio);
      venc.setDate(venc.getDate() + intervaloEmDias * (i + 1));
      return {
        numero: i + 1,
        valorDevido: arred(parcela),
        valorPrincipal: arred(valorPrincipal / numParcelas),
        valorJuros: arred(totalJuros / numParcelas),
        saldoDevedor: arred(valorTotal - parcela * (i + 1)),
        dataVencimento: venc,
      };
    });
  } else {
    // Juros simples (padrão) ou por_parcela — mesma fórmula flat
    totalJuros = valorPrincipal * r * numParcelas;
    valorTotal = valorPrincipal + totalJuros;
    const parcela = valorTotal / numParcelas;
    const jurosParcela = totalJuros / numParcelas;
    const principalParcela = valorPrincipal / numParcelas;

    parcelas = Array.from({ length: numParcelas }, (_, i) => {
      const isLast = i === numParcelas - 1;
      const venc = new Date(dataInicio);
      venc.setDate(venc.getDate() + intervaloEmDias * (i + 1));

      const vDevido = isLast ? arred(valorTotal - parcela * (numParcelas - 1)) : arred(parcela);
      const vJuros  = isLast ? arred(totalJuros - jurosParcela * (numParcelas - 1)) : arred(jurosParcela);
      const vPrinc  = isLast ? arred(valorPrincipal - principalParcela * (numParcelas - 1)) : arred(principalParcela);

      return {
        numero: i + 1,
        valorDevido: vDevido,
        valorPrincipal: vPrinc,
        valorJuros: vJuros,
        saldoDevedor: arred(valorTotal - parcela * (i + 1)),
        dataVencimento: venc,
      };
    });
  }

  return {
    valorPrincipal,
    taxaJuros,
    totalJuros: arred(totalJuros),
    valorTotal: arred(valorTotal),
    valorParcela: arred(parcelas[0].valorDevido),
    numParcelas,
    parcelas,
  };
}

// ─── Juros diário ─────────────────────────────────────────────────────────────

export interface JurosDiarioResult {
  taxaMensal: number;
  taxaDiaria: number;           // taxa/30
  jurosPorDia: number;          // principal × taxaDiaria
  totalJurosDias: (dias: number) => number;
  valorTotalDias: (dias: number) => number;
}

export function calcularJurosDiario(
  principal: number,
  taxaMensalPct: number         // ex: 10 para 10%/mês
): JurosDiarioResult {
  const taxaMensal = taxaMensalPct / 100;
  const taxaDiaria = taxaMensal / 30;
  const jurosPorDia = principal * taxaDiaria;

  return {
    taxaMensal: taxaMensalPct,
    taxaDiaria: taxaDiaria * 100,   // em %
    jurosPorDia: arred(jurosPorDia),
    totalJurosDias: (dias) => arred(jurosPorDia * dias),
    valorTotalDias: (dias) => arred(principal + jurosPorDia * dias),
  };
}

// ─── Pagamento antecipado (pro-rata) ─────────────────────────────────────────

export interface ResultadoAntecipado {
  dataVencimento: Date;
  dataPagamentoEfetivo: Date;
  diasAntecipados: number;
  diasUsados: number;
  jurosOriginais: number;
  jurosProRata: number;
  descontoJuros: number;
  valorOriginal: number;
  valorComDesconto: number;
  percentualDesconto: number;
}

export function calcularPagamentoAntecipado(
  dataVencimento: Date,
  dataInicioPeriodo: Date,
  valorDevido: number,
  valorPrincipal: number,
  valorJuros: number,
  taxaMensalPct: number
): ResultadoAntecipado {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const venc = new Date(dataVencimento);
  venc.setHours(0, 0, 0, 0);

  const inicio = new Date(dataInicioPeriodo);
  inicio.setHours(0, 0, 0, 0);

  const diasAntecipados = Math.max(0, Math.floor((venc.getTime() - hoje.getTime()) / 86400000));
  const diasTotaisPeriodo = Math.max(1, Math.floor((venc.getTime() - inicio.getTime()) / 86400000));
  const diasUsados = diasTotaisPeriodo - diasAntecipados;

  // Juros pro-rata: proporcional aos dias usados
  const taxaDiaria = (taxaMensalPct / 100) / 30;
  const jurosProRata = arred(valorPrincipal * taxaDiaria * diasUsados);
  const descontoJuros = arred(Math.max(0, valorJuros - jurosProRata));
  const valorComDesconto = arred(valorPrincipal + jurosProRata);
  const percentualDesconto = valorDevido > 0 ? arred((descontoJuros / valorDevido) * 100) : 0;

  return {
    dataVencimento: venc,
    dataPagamentoEfetivo: hoje,
    diasAntecipados,
    diasUsados,
    jurosOriginais: valorJuros,
    jurosProRata,
    descontoJuros,
    valorOriginal: valorDevido,
    valorComDesconto,
    percentualDesconto,
  };
}

// ─── Juros de atraso ──────────────────────────────────────────────────────────

export interface ResultadoAtraso {
  diasAtraso: number;
  taxaDiariaAtraso: number;     // %/dia
  jurosAtraso: number;
  valorAtualizado: number;
}

export function calcularJurosAtraso(
  valorBase: number,                       // valor da parcela ou saldo restante
  dataVencimento: Date,
  taxaDiariaPct: number = 1,              // 1% ao dia (padrão)
  modo: "parcela" | "saldo" = "parcela"  // Regra A ou B
): ResultadoAtraso {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento);
  venc.setHours(0, 0, 0, 0);

  const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86400000));
  const taxa = taxaDiariaPct / 100;
  const jurosAtraso = arred(valorBase * taxa * diasAtraso);
  const valorAtualizado = arred(valorBase + jurosAtraso);

  return {
    diasAtraso,
    taxaDiariaAtraso: taxaDiariaPct,
    jurosAtraso,
    valorAtualizado,
  };
}

// ─── CET (Custo Efetivo Total anualizado) ────────────────────────────────────

export function calcularCET(taxaMensalPct: number, tipo: TipoCalculo): number {
  const r = taxaMensalPct / 100;
  if (tipo === "composto" || tipo === "price") {
    return arred((Math.pow(1 + r, 12) - 1) * 100);
  }
  return arred(r * 12 * 100);
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function arred(n: number): number {
  return Math.round(n * 100) / 100;
}
