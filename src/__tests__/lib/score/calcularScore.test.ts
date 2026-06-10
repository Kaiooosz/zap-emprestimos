/**
 * Testes unitários — lib/score/calcularScore.ts
 *
 * Cobre:
 *  - calcularScoreCompleto (todos os eventos de score)
 *  - getFaixa (5 faixas de classificação)
 *  - getPontosLabel
 *
 * Nota: calcularScoreCompleto importa tipos do store legado.
 * Os testes constroem objetos compatíveis com esses tipos manualmente.
 */

import { calcularScoreCompleto, getFaixa, getPontosLabel } from "@/lib/score/calcularScore";

// ─── Factories de dados de teste ──────────────────────────────────────────────

/** Cria uma parcela mínima para os testes */
function makeParcela(overrides: Partial<{
  id: string;
  numero: number;
  status: "PENDENTE" | "PAGO" | "ATRASADO" | "PARCIAL";
  dataVencimento: string;
  dataPagamento: string | null;
  valorPago: number;
  emprestimoId: string;
}> = {}) {
  return {
    id: "parcela-1",
    numero: 1,
    status: "PAGO" as const,
    dataVencimento: new Date().toISOString(),
    dataPagamento: new Date().toISOString(),
    valorPago: 1000,
    emprestimoId: "emp-1",
    ...overrides,
  };
}

/** Cria um empréstimo mínimo para os testes */
function makeEmprestimo(overrides: Partial<{
  id: string;
  status: "ATIVO" | "QUITADO" | "INADIMPLENTE" | "CANCELADO";
  valorPrincipal: number;
  createdAt: string;
}> = {}) {
  return {
    id: "emp-1",
    status: "ATIVO" as const,
    valorPrincipal: 10000,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── calcularScoreCompleto ────────────────────────────────────────────────────

describe("calcularScoreCompleto", () => {
  it("score inicial = 500 com histórico vazio", () => {
    const res = calcularScoreCompleto([], []);
    expect(res.score).toBe(500);
  });

  describe("Pagamento no prazo (+20 pts)", () => {
    it("pago no mesmo dia do vencimento: +20", () => {
      const hoje = new Date();
      const parcela = makeParcela({
        status: "PAGO",
        dataVencimento: hoje.toISOString(),
        dataPagamento: hoje.toISOString(),
        valorPago: 1000,
      });
      const res = calcularScoreCompleto([parcela as any], []);
      expect(res.score).toBe(520); // 500 + 20
    });

    it("pago 2 dias após o vencimento ainda conta como no prazo", () => {
      const venc = new Date();
      venc.setDate(venc.getDate() - 2);
      const parcela = makeParcela({
        status: "PAGO",
        dataVencimento: venc.toISOString(),
        dataPagamento: new Date().toISOString(),
        valorPago: 1000,
      });
      const res = calcularScoreCompleto([parcela as any], []);
      expect(res.score).toBe(520);
    });
  });

  describe("Pagamento antecipado (+35 pts)", () => {
    it("pago 3+ dias antes do vencimento: +35", () => {
      const venc = new Date();
      venc.setDate(venc.getDate() + 5); // vencimento em 5 dias

      const pagamento = new Date();  // pago hoje

      const parcela = makeParcela({
        status: "PAGO",
        dataVencimento: venc.toISOString(),
        dataPagamento: pagamento.toISOString(),
        valorPago: 1000,
      });
      const res = calcularScoreCompleto([parcela as any], []);
      expect(res.score).toBe(535); // 500 + 35
    });
  });

  describe("Atraso leve (1-7 dias): -40 pts", () => {
    it("pago com 5 dias de atraso: -40", () => {
      const venc = new Date();
      venc.setDate(venc.getDate() - 5);

      const pagamento = new Date();

      const parcela = makeParcela({
        status: "PAGO",
        dataVencimento: venc.toISOString(),
        dataPagamento: pagamento.toISOString(),
        valorPago: 1000,
      });
      const res = calcularScoreCompleto([parcela as any], []);
      expect(res.score).toBe(460); // 500 - 40
    });
  });

  describe("Atraso moderado (8-30 dias): -100 pts", () => {
    it("pago com 15 dias de atraso: -100", () => {
      const venc = new Date();
      venc.setDate(venc.getDate() - 15);

      const parcela = makeParcela({
        status: "PAGO",
        dataVencimento: venc.toISOString(),
        dataPagamento: new Date().toISOString(),
        valorPago: 1000,
      });
      const res = calcularScoreCompleto([parcela as any], []);
      expect(res.score).toBe(400); // 500 - 100
    });
  });

  describe("Atraso grave (31+ dias): -200 pts", () => {
    it("pago com 45 dias de atraso: -200", () => {
      const venc = new Date();
      venc.setDate(venc.getDate() - 45);

      const parcela = makeParcela({
        status: "PAGO",
        dataVencimento: venc.toISOString(),
        dataPagamento: new Date().toISOString(),
        valorPago: 1000,
      });
      const res = calcularScoreCompleto([parcela as any], []);
      expect(res.score).toBe(300); // 500 - 200
    });
  });

  describe("Parcelas em atraso (não pagas ainda)", () => {
    it("parcela com status ATRASADO reduz o score", () => {
      const venc = new Date();
      venc.setDate(venc.getDate() - 15); // 15 dias em atraso

      const parcela = makeParcela({
        status: "ATRASADO",
        dataVencimento: venc.toISOString(),
        dataPagamento: null,
        valorPago: 0,
      });
      const res = calcularScoreCompleto([parcela as any], []);
      expect(res.score).toBeLessThan(500);
    });
  });

  describe("Bônus por 5 consecutivas no prazo (+50 pts)", () => {
    it("ao completar 5 parcelas consecutivas no prazo, ganha +50 pts adicionais", () => {
      const hoje = new Date();
      const parcelas = Array.from({ length: 5 }, (_, i) => {
        return makeParcela({
          id: `parcela-${i + 1}`,
          numero: i + 1,
          status: "PAGO",
          dataVencimento: hoje.toISOString(),
          dataPagamento: hoje.toISOString(),
          valorPago: 500,
        });
      });
      const res = calcularScoreCompleto(parcelas as any[], []);
      // 500 + 5×20 + 50 (bônus consecutivas) = 650
      expect(res.score).toBe(650);
    });
  });

  describe("Bônus: empréstimo quitado (+100 pts)", () => {
    it("empréstimo QUITADO acrescenta +100 ao score", () => {
      const emp = makeEmprestimo({ status: "QUITADO" });
      const res = calcularScoreCompleto([], [emp as any]);
      expect(res.score).toBe(600); // 500 + 100
    });
  });

  describe("Penalidade: empréstimo INADIMPLENTE (-350 pts)", () => {
    it("empréstimo inadimplente reduz -350", () => {
      const emp = makeEmprestimo({ status: "INADIMPLENTE" });
      const res = calcularScoreCompleto([], [emp as any]);
      expect(res.score).toBe(150); // 500 - 350
    });
  });

  describe("Bônus volume > R$5.000 (+75 pts)", () => {
    it("volume total pago acima de 5000 ganha +75", () => {
      const hoje = new Date();
      const parcelas = Array.from({ length: 3 }, (_, i) =>
        makeParcela({
          id: `p-${i}`,
          numero: i + 1,
          status: "PAGO",
          dataVencimento: hoje.toISOString(),
          dataPagamento: hoje.toISOString(),
          valorPago: 2000, // 3 × 2000 = 6000 > 5000
        })
      );
      const res = calcularScoreCompleto(parcelas as any[], []);
      // 500 + 3×20 (no prazo) + 75 (volume)
      expect(res.score).toBe(635);
    });
  });

  describe("Limites do score (clamp)", () => {
    it("score nunca vai abaixo de 0", () => {
      const hoje = new Date();
      // Muitas parcelas atrasadas graves
      const parcelas = Array.from({ length: 5 }, (_, i) => {
        const venc = new Date();
        venc.setDate(hoje.getDate() - 60);
        return makeParcela({
          id: `p-${i}`,
          numero: i + 1,
          status: "PAGO",
          dataVencimento: venc.toISOString(),
          dataPagamento: hoje.toISOString(),
          valorPago: 0,
        });
      });
      const res = calcularScoreCompleto(parcelas as any[], []);
      expect(res.score).toBeGreaterThanOrEqual(0);
    });

    it("score nunca vai acima de 1000", () => {
      const hoje = new Date();
      // Muitas parcelas antecipadas + empréstimos quitados
      const parcelas = Array.from({ length: 30 }, (_, i) => {
        const venc = new Date();
        venc.setDate(hoje.getDate() + 10);
        return makeParcela({
          id: `p-${i}`,
          numero: i + 1,
          status: "PAGO",
          dataVencimento: venc.toISOString(),
          dataPagamento: hoje.toISOString(),
          valorPago: 500,
        });
      });
      const emprestimos = Array.from({ length: 10 }, (_, i) =>
        makeEmprestimo({ id: `e-${i}`, status: "QUITADO" })
      );
      const res = calcularScoreCompleto(parcelas as any[], emprestimos as any[]);
      expect(res.score).toBeLessThanOrEqual(1000);
    });
  });

  describe("eventos no resultado", () => {
    it("retorna no máximo 20 eventos", () => {
      const hoje = new Date();
      const parcelas = Array.from({ length: 30 }, (_, i) =>
        makeParcela({
          id: `p-${i}`,
          numero: i + 1,
          status: "PAGO",
          dataVencimento: hoje.toISOString(),
          dataPagamento: hoje.toISOString(),
          valorPago: 100,
        })
      );
      const res = calcularScoreCompleto(parcelas as any[], []);
      expect(res.eventos.length).toBeLessThanOrEqual(20);
    });
  });
});

// ─── getFaixa ─────────────────────────────────────────────────────────────────

describe("getFaixa", () => {
  const casos: Array<[number, string, string]> = [
    [1000, "EXCELENTE", "Excelente"],
    [851,  "EXCELENTE", "Excelente"],
    [850,  "BOM",       "Bom"],
    [701,  "BOM",       "Bom"],
    [700,  "REGULAR",   "Regular"],
    [501,  "REGULAR",   "Regular"],
    [500,  "ALTO_RISCO","Alto Risco"],
    [301,  "ALTO_RISCO","Alto Risco"],
    [300,  "MUITO_ALTO_RISCO", "Muito Alto Risco"],
    [0,    "MUITO_ALTO_RISCO", "Muito Alto Risco"],
  ];

  it.each(casos)("score %i → faixa %s (%s)", (score, faixa, label) => {
    const res = getFaixa(score);
    expect(res.faixa).toBe(faixa);
    expect(res.label).toBe(label);
    expect(res.color).toBeTruthy();
  });
});

// ─── getPontosLabel ───────────────────────────────────────────────────────────

describe("getPontosLabel", () => {
  it("pontos positivos exibem sinal +", () => {
    expect(getPontosLabel(20)).toBe("+20");
    expect(getPontosLabel(100)).toBe("+100");
  });

  it("pontos negativos exibem sinal -", () => {
    expect(getPontosLabel(-40)).toBe("-40");
    expect(getPontosLabel(-200)).toBe("-200");
  });

  it("zero exibe 0 sem sinal", () => {
    expect(getPontosLabel(0)).toBe("0");
  });
});
