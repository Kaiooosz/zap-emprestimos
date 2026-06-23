import { Parcela, Emprestimo } from "@/lib/store";

export type ScoreFaixa = "MUITO_ALTO_RISCO" | "ALTO_RISCO" | "REGULAR" | "BOM" | "EXCELENTE";

export interface ScoreEvento {
  tipo: string;
  pontos: number;
  descricao: string;
  data: string;
}

export interface ScoreResultado {
  score: number;
  faixa: ScoreFaixa;
  label: string;
  color: string;
  eventos: ScoreEvento[];
}

const SCORE_INICIAL = 500;
const SCORE_MAX = 1000;
const SCORE_MIN = 0;

const PONTOS = {
  PAGO_ANTECIPADO:         +35,   // 3+ dias antes
  PAGO_NO_PRAZO:           +20,   // 0-2 dias antes
  QUITACAO_COMPLETA:       +100,  // empréstimo 100% quitado
  VOLUME_ALTO:             +75,   // total pago > R$5000
  CONSECUTIVAS_BONUS:      +50,   // 5 parcelas seguidas no prazo
  ATRASO_LEVE:             -40,   // 1-7 dias
  ATRASO_MODERADO:         -100,  // 8-30 dias
  ATRASO_GRAVE:            -200,  // 31+ dias
  INADIMPLENTE:            -350,  // empréstimo inadimplente
};

export function calcularScoreCompleto(
  parcelas: Parcela[],
  emprestimos: Emprestimo[]
): ScoreResultado {
  let score = SCORE_INICIAL;
  const eventos: ScoreEvento[] = [];

  const parcelasPagas = parcelas.filter((p) => p.status === "PAGO" && p.dataPagamento);

  let consecutivas = 0;
  let totalPago = 0;

  for (const p of parcelasPagas) {
    const venc = new Date(p.dataVencimento);
    const pago = new Date(p.dataPagamento!);
    const diffDias = Math.floor((pago.getTime() - venc.getTime()) / 86400000);

    totalPago += p.valorPago ?? 0;

    if (diffDias <= -3) {
      score += PONTOS.PAGO_ANTECIPADO;
      consecutivas++;
      eventos.push({ tipo: "PAGO_ANTECIPADO", pontos: PONTOS.PAGO_ANTECIPADO, descricao: `Parcela ${p.numero} paga com antecedência`, data: p.dataPagamento! });
    } else if (diffDias <= 2) {
      score += PONTOS.PAGO_NO_PRAZO;
      consecutivas++;
      eventos.push({ tipo: "PAGO_NO_PRAZO", pontos: PONTOS.PAGO_NO_PRAZO, descricao: `Parcela ${p.numero} paga no prazo`, data: p.dataPagamento! });
    } else if (diffDias <= 7) {
      score += PONTOS.ATRASO_LEVE;
      consecutivas = 0;
      eventos.push({ tipo: "ATRASO_LEVE", pontos: PONTOS.ATRASO_LEVE, descricao: `Parcela ${p.numero} paga com ${diffDias} dias de atraso`, data: p.dataPagamento! });
    } else if (diffDias <= 30) {
      score += PONTOS.ATRASO_MODERADO;
      consecutivas = 0;
      eventos.push({ tipo: "ATRASO_MODERADO", pontos: PONTOS.ATRASO_MODERADO, descricao: `Parcela ${p.numero} paga com ${diffDias} dias de atraso`, data: p.dataPagamento! });
    } else {
      score += PONTOS.ATRASO_GRAVE;
      consecutivas = 0;
      eventos.push({ tipo: "ATRASO_GRAVE", pontos: PONTOS.ATRASO_GRAVE, descricao: `Parcela ${p.numero} paga com ${diffDias} dias de atraso`, data: p.dataPagamento! });
    }

    // Bonus por consecutivas
    if (consecutivas > 0 && consecutivas % 5 === 0) {
      score += PONTOS.CONSECUTIVAS_BONUS;
      eventos.push({ tipo: "CONSECUTIVAS_BONUS", pontos: PONTOS.CONSECUTIVAS_BONUS, descricao: `${consecutivas} pagamentos consecutivos no prazo`, data: p.dataPagamento! });
    }
  }

  // Parcelas atrasadas (não pagas ainda)
  const parcelasAtrasadas = parcelas.filter((p) => p.status === "ATRASADO");
  for (const p of parcelasAtrasadas) {
    const venc = new Date(p.dataVencimento);
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const diffDias = Math.floor((inicioHoje.getTime() - venc.getTime()) / 86400000);
    const pontos = diffDias > 30 ? PONTOS.ATRASO_GRAVE : diffDias > 7 ? PONTOS.ATRASO_MODERADO : PONTOS.ATRASO_LEVE;
    score += pontos;
    eventos.push({ tipo: "ATRASADO", pontos, descricao: `Parcela ${p.numero} em atraso há ${diffDias} dias`, data: agora.toISOString() });
  }

  // Bonus: empréstimos quitados
  const quitados = emprestimos.filter((e) => e.status === "QUITADO");
  for (const e of quitados) {
    score += PONTOS.QUITACAO_COMPLETA;
    eventos.push({ tipo: "QUITACAO_COMPLETA", pontos: PONTOS.QUITACAO_COMPLETA, descricao: `Empréstimo de R$${e.valorPrincipal.toFixed(2)} quitado`, data: e.createdAt });
  }

  // Bonus: empréstimos inadimplentes
  const inadimplentes = emprestimos.filter((e) => e.status === "INADIMPLENTE");
  for (const e of inadimplentes) {
    score += PONTOS.INADIMPLENTE;
    eventos.push({ tipo: "INADIMPLENTE", pontos: PONTOS.INADIMPLENTE, descricao: `Empréstimo de R$${e.valorPrincipal.toFixed(2)} em inadimplência`, data: e.createdAt });
  }

  // Bonus: volume alto
  if (totalPago >= 5000) {
    score += PONTOS.VOLUME_ALTO;
    eventos.push({ tipo: "VOLUME_ALTO", pontos: PONTOS.VOLUME_ALTO, descricao: `Volume total pago supera R$5.000`, data: new Date().toISOString() });
  }

  score = Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
  score = Math.round(score);

  return { score, ...getFaixa(score), eventos: eventos.slice(-20).reverse() };
}

export function getFaixa(score: number): { faixa: ScoreFaixa; label: string; color: string } {
  if (score >= 851) return { faixa: "EXCELENTE",        label: "Excelente",        color: "#22c55e" };
  if (score >= 701) return { faixa: "BOM",              label: "Bom",              color: "#6A95B4" };
  if (score >= 501) return { faixa: "REGULAR",          label: "Regular",          color: "#f59e0b" };
  if (score >= 301) return { faixa: "ALTO_RISCO",       label: "Alto Risco",       color: "#f97316" };
  return               { faixa: "MUITO_ALTO_RISCO",  label: "Muito Alto Risco", color: "#ef4444" };
}

export function getPontosLabel(pontos: number): string {
  return pontos > 0 ? `+${pontos}` : String(pontos);
}
