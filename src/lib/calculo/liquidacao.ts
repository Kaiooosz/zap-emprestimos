/**
 * Motor de liquidação — Zap Empréstimos
 *
 * Modalidade 1 — Mensal Rolável:
 *   - Juros calculados sobre o saldo devedor no início de cada período
 *   - Opções de pagamento:
 *     A) Valor total (principal + juros) → quita
 *     B) Só os juros → adia, principal intacto
 *     C) Juros + parte do principal → abate saldo, calcula novos juros
 *
 * Modalidade 2 — Parcelado:
 *   - Pagamento exato: avança parcela
 *   - Pagamento acima: retém excedente para próxima
 *   - Pagamento abaixo: inadimplência parcial; juros de atraso sobre saldo restante ou parcela inteira
 *
 * Juros de atraso (configurável por perfil):
 *   Regra A: jurosDia = parcela × taxa% × dias
 *   Regra B: jurosDia = saldoRestante × taxa% × dias
 */

export type RegraJurosAtraso = "PARCELA" | "SALDO";

export interface PerfilJuros {
  taxaMensal:      number; // % ex: 30
  taxaDiariaAtraso: number; // % ex: 1
  regraAtraso:     RegraJurosAtraso;
}

// ─── Juros de atraso ──────────────────────────────────────────────────────────

export function calcJurosAtraso(params: {
  valorParcela:   number;
  valorPago:      number;   // o que já foi pago na parcela
  diasAtraso:     number;
  taxaDiaria:     number;   // ex: 1 (%)
  regra:          RegraJurosAtraso;
}): number {
  const { valorParcela, valorPago, diasAtraso, taxaDiaria, regra } = params;
  if (diasAtraso <= 0) return 0;
  const base   = regra === "PARCELA" ? valorParcela : Math.max(0, valorParcela - valorPago);
  return Number((base * diasAtraso * taxaDiaria / 100).toFixed(2));
}

// ─── Modalidade 1 — Mensal Rolável ───────────────────────────────────────────

export interface LiquidacaoMensalInput {
  saldoDevedor:   number;   // principal em aberto
  taxaMensal:     number;   // % ex: 30
  valorRecebido:  number;   // o que o cliente pagou
  taxaDiaria:     number;
  diasAtraso:     number;
  regraAtraso:    RegraJurosAtraso;
}

export interface LiquidacaoMensalResult {
  jurosDevidos:   number;   // juros do período atual
  jurosAtraso:    number;   // penalidade por atraso
  abatimentoPrincipal: number; // quanto abateu do principal
  novoSaldoDevedor: number; // principal restante
  totalPago:      number;
  modoLiquidacao: "QUITA" | "SO_JUROS" | "PARCIAL";
  percentQuitado: number;   // % do principal original (precisa saber principal original)
}

export function liquidarMensal(
  params: LiquidacaoMensalInput,
  principalOriginal: number
): LiquidacaoMensalResult {
  const { saldoDevedor, taxaMensal, valorRecebido, taxaDiaria, diasAtraso, regraAtraso } = params;
  const jurosDevidos = Number((saldoDevedor * taxaMensal / 100).toFixed(2));
  const totalDevido  = Number((saldoDevedor + jurosDevidos).toFixed(2));

  // Juros de atraso (calculado sobre os juros devidos ou saldo)
  const jurosAtraso = calcJurosAtraso({
    valorParcela: jurosDevidos,
    valorPago:    0,
    diasAtraso,
    taxaDiaria,
    regra: regraAtraso,
  });

  const totalComAtraso = Number((totalDevido + jurosAtraso).toFixed(2));
  let modoLiquidacao: LiquidacaoMensalResult["modoLiquidacao"] = "PARCIAL";
  let abatimentoPrincipal = 0;
  let novoSaldoDevedor    = saldoDevedor;

  if (valorRecebido >= totalComAtraso - 0.01) {
    // A) Quita tudo
    modoLiquidacao       = "QUITA";
    abatimentoPrincipal  = saldoDevedor;
    novoSaldoDevedor     = 0;
  } else if (valorRecebido >= jurosDevidos + jurosAtraso - 0.01) {
    // B ou C) Cobre juros + possível abatimento
    const excedenteAposJuros = Number((valorRecebido - jurosDevidos - jurosAtraso).toFixed(2));
    if (excedenteAposJuros <= 0.01) {
      // B) Só os juros
      modoLiquidacao = "SO_JUROS";
    } else {
      // C) Abate principal
      abatimentoPrincipal = excedenteAposJuros;
      novoSaldoDevedor    = Number(Math.max(0, saldoDevedor - excedenteAposJuros).toFixed(2));
      modoLiquidacao      = "PARCIAL";
    }
  } else {
    // Pagamento insuficiente para cobrir nem os juros
    modoLiquidacao = "PARCIAL";
  }

  const percentQuitado = principalOriginal > 0
    ? Number(((1 - novoSaldoDevedor / principalOriginal) * 100).toFixed(1))
    : 100;

  return {
    jurosDevidos,
    jurosAtraso,
    abatimentoPrincipal,
    novoSaldoDevedor,
    totalPago:    valorRecebido,
    modoLiquidacao,
    percentQuitado,
  };
}

// ─── Modalidade 2 — Parcelado ─────────────────────────────────────────────────

export interface LiquidacaoParceladaInput {
  valorParcela:   number;
  saldoRetido:    number;   // excedente retido de pagamentos anteriores
  valorRecebido:  number;
  taxaDiaria:     number;
  diasAtraso:     number;
  regraAtraso:    RegraJurosAtraso;
  valorPago:      number;   // o que já foi pago nesta parcela (para regra B)
}

export interface LiquidacaoParceladaResult {
  jurosAtraso:      number;
  totalEfetivo:     number; // saldoRetido + valorRecebido
  cobreParcela:     boolean;
  novoSaldoRetido:  number; // excedente para próxima
  percentParcela:   number; // % da parcela paga
}

export function liquidarParcelado(params: LiquidacaoParceladaInput): LiquidacaoParceladaResult {
  const { valorParcela, saldoRetido, valorRecebido, taxaDiaria, diasAtraso, regraAtraso, valorPago } = params;

  const jurosAtraso  = calcJurosAtraso({ valorParcela, valorPago, diasAtraso, taxaDiaria, regra: regraAtraso });
  const totalEfetivo = Number((saldoRetido + valorRecebido).toFixed(2));
  const totalNecessario = Number((valorParcela + jurosAtraso).toFixed(2));

  let novoSaldoRetido = 0;
  let cobreParcela    = false;

  if (totalEfetivo >= totalNecessario - 0.01) {
    cobreParcela    = true;
    novoSaldoRetido = Number(Math.max(0, totalEfetivo - totalNecessario).toFixed(2));
  }

  const percentParcela = Math.min(100, Number((totalEfetivo / totalNecessario * 100).toFixed(1)));

  return { jurosAtraso, totalEfetivo, cobreParcela, novoSaldoRetido, percentParcela };
}

// ─── Simulação de Empréstimo Mensal Rolável ───────────────────────────────────

export interface SimulacaoMensalParams {
  principal:    number;
  taxaMensal:   number; // %
  meses:        number; // quantos meses simular
}

export interface SimulacaoMensalPeriodo {
  mes:           number;
  saldoInicio:   number;
  juros:         number;
  totalDevido:   number;
  // Cenário: paga só juros
  pagandoJuros:  number;
  saldoSeJuros:  number;
  // Cenário: quita tudo
  paraQuitar:    number;
}

export function simularMensalRolavel(params: SimulacaoMensalParams): SimulacaoMensalPeriodo[] {
  const { principal, taxaMensal, meses } = params;
  const periodos: SimulacaoMensalPeriodo[] = [];
  let saldo = principal;

  for (let i = 1; i <= meses; i++) {
    const juros      = Number((saldo * taxaMensal / 100).toFixed(2));
    const totalDevido = Number((saldo + juros).toFixed(2));
    periodos.push({
      mes:          i,
      saldoInicio:  saldo,
      juros,
      totalDevido,
      pagandoJuros: juros,
      saldoSeJuros: saldo,
      paraQuitar:   totalDevido,
    });
    // Para o próximo mês (cenário: pagou só juros, principal não muda)
  }
  return periodos;
}
