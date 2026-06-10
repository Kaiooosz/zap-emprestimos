/**
 * Testes unitários — lib/calculo/liquidacao.ts
 *
 * Cobre:
 *  - calcJurosAtraso (Regra A e B)
 *  - liquidarMensal (Opções A, B, C + atraso)
 *  - liquidarParcelado (exato, acima, abaixo)
 *  - simularMensalRolavel
 */

import {
  calcJurosAtraso,
  liquidarMensal,
  liquidarParcelado,
  simularMensalRolavel,
} from "@/lib/calculo/liquidacao";

// ─── calcJurosAtraso ──────────────────────────────────────────────────────────

describe("calcJurosAtraso", () => {
  describe("Regra A — base: parcela inteira", () => {
    it("retorna 0 quando diasAtraso é 0", () => {
      const resultado = calcJurosAtraso({
        valorParcela: 1200,
        valorPago: 0,
        diasAtraso: 0,
        taxaDiaria: 1,
        regra: "PARCELA",
      });
      expect(resultado).toBe(0);
    });

    it("retorna 0 quando diasAtraso é negativo", () => {
      const resultado = calcJurosAtraso({
        valorParcela: 1200,
        valorPago: 0,
        diasAtraso: -5,
        taxaDiaria: 1,
        regra: "PARCELA",
      });
      expect(resultado).toBe(0);
    });

    it("calcula corretamente: 1200 × 1% × 3 = 36", () => {
      const resultado = calcJurosAtraso({
        valorParcela: 1200,
        valorPago: 0,
        diasAtraso: 3,
        taxaDiaria: 1,
        regra: "PARCELA",
      });
      expect(resultado).toBeCloseTo(36, 2);
    });

    it("ignora valorPago na Regra A (base é sempre a parcela inteira)", () => {
      const semPagamento = calcJurosAtraso({
        valorParcela: 1200, valorPago: 0, diasAtraso: 3, taxaDiaria: 1, regra: "PARCELA",
      });
      const comPagamentoParcial = calcJurosAtraso({
        valorParcela: 1200, valorPago: 400, diasAtraso: 3, taxaDiaria: 1, regra: "PARCELA",
      });
      expect(semPagamento).toBe(comPagamentoParcial);
    });
  });

  describe("Regra B — base: saldo restante", () => {
    it("usa (valorParcela - valorPago) como base", () => {
      // Saldo: 1200 - 400 = 800; 800 × 1% × 3 = 24
      const resultado = calcJurosAtraso({
        valorParcela: 1200,
        valorPago: 400,
        diasAtraso: 3,
        taxaDiaria: 1,
        regra: "SALDO",
      });
      expect(resultado).toBeCloseTo(24, 2);
    });

    it("quando valorPago = 0, regra B = regra A", () => {
      const regraA = calcJurosAtraso({ valorParcela: 1000, valorPago: 0, diasAtraso: 5, taxaDiaria: 1, regra: "PARCELA" });
      const regraB = calcJurosAtraso({ valorParcela: 1000, valorPago: 0, diasAtraso: 5, taxaDiaria: 1, regra: "SALDO" });
      expect(regraA).toBe(regraB);
    });

    it("não retorna negativo quando valorPago >= valorParcela", () => {
      const resultado = calcJurosAtraso({
        valorParcela: 1000,
        valorPago: 1500,
        diasAtraso: 5,
        taxaDiaria: 1,
        regra: "SALDO",
      });
      expect(resultado).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── liquidarMensal ───────────────────────────────────────────────────────────

describe("liquidarMensal", () => {
  const baseParams = {
    saldoDevedor: 10000,
    taxaMensal: 30,          // 30%
    taxaDiaria: 1,
    diasAtraso: 0,
    regraAtraso: "PARCELA" as const,
  };
  const principalOriginal = 10000;

  // juros = 10000 × 30% = 3000; totalDevido = 13000
  describe("Opção A — Liquidação total (paga tudo)", () => {
    it("modo = QUITA quando valorRecebido >= totalDevido", () => {
      const res = liquidarMensal({ ...baseParams, valorRecebido: 13000 }, principalOriginal);
      expect(res.modoLiquidacao).toBe("QUITA");
    });

    it("novoSaldoDevedor = 0 na liquidação total", () => {
      const res = liquidarMensal({ ...baseParams, valorRecebido: 13000 }, principalOriginal);
      expect(res.novoSaldoDevedor).toBe(0);
    });

    it("percentQuitado = 100% na liquidação total", () => {
      const res = liquidarMensal({ ...baseParams, valorRecebido: 13000 }, principalOriginal);
      expect(res.percentQuitado).toBe(100);
    });

    it("aceita valor ligeiramente acima do total (tolerância 0.01)", () => {
      const res = liquidarMensal({ ...baseParams, valorRecebido: 13000.005 }, principalOriginal);
      expect(res.modoLiquidacao).toBe("QUITA");
    });
  });

  describe("Opção B — Paga só os juros (renovação)", () => {
    it("modo = SO_JUROS quando valorRecebido = juros devidos", () => {
      // juros = 3000
      const res = liquidarMensal({ ...baseParams, valorRecebido: 3000 }, principalOriginal);
      expect(res.modoLiquidacao).toBe("SO_JUROS");
    });

    it("saldo devedor permanece intacto ao pagar só os juros", () => {
      const res = liquidarMensal({ ...baseParams, valorRecebido: 3000 }, principalOriginal);
      expect(res.novoSaldoDevedor).toBe(10000);
    });

    it("abatimentoPrincipal = 0 ao pagar só os juros", () => {
      const res = liquidarMensal({ ...baseParams, valorRecebido: 3000 }, principalOriginal);
      expect(res.abatimentoPrincipal).toBe(0);
    });
  });

  describe("Opção C — Abatimento parcial do principal", () => {
    it("abate o excedente além dos juros no principal", () => {
      // Paga 5000: 3000 juros + 2000 abate principal
      const res = liquidarMensal({ ...baseParams, valorRecebido: 5000 }, principalOriginal);
      expect(res.modoLiquidacao).toBe("PARCIAL");
      expect(res.abatimentoPrincipal).toBeCloseTo(2000, 1);
      expect(res.novoSaldoDevedor).toBeCloseTo(8000, 1);
    });

    it("percentQuitado reflete abatimento correto", () => {
      const res = liquidarMensal({ ...baseParams, valorRecebido: 5000 }, principalOriginal);
      // (10000 - 8000) / 10000 × 100 = 20%
      expect(res.percentQuitado).toBeCloseTo(20, 0);
    });
  });

  describe("Pagamento com atraso", () => {
    it("juros de atraso são somados ao total devidos", () => {
      const params = { ...baseParams, diasAtraso: 5 };
      const semAtraso = liquidarMensal({ ...baseParams, valorRecebido: 13000 }, principalOriginal);
      const comAtraso  = liquidarMensal({ ...params, valorRecebido: 13000 }, principalOriginal);

      // Com atraso, 13000 não quita mais (faltam os juros de atraso)
      expect(comAtraso.jurosAtraso).toBeGreaterThan(0);
    });

    it("com atraso de 5 dias, juros = 3000 × 1% × 5 = 150", () => {
      const res = liquidarMensal({ ...baseParams, diasAtraso: 5, valorRecebido: 0 }, principalOriginal);
      expect(res.jurosAtraso).toBeCloseTo(150, 1);
    });
  });

  describe("Edge cases", () => {
    it("percentQuitado = 100 quando principalOriginal = 0", () => {
      const res = liquidarMensal({ ...baseParams, saldoDevedor: 0, valorRecebido: 0 }, 0);
      expect(res.percentQuitado).toBe(100);
    });
  });
});

// ─── liquidarParcelado ────────────────────────────────────────────────────────

describe("liquidarParcelado", () => {
  const baseParams = {
    valorParcela: 1200,
    saldoRetido: 0,
    taxaDiaria: 1,
    diasAtraso: 0,
    regraAtraso: "PARCELA" as const,
    valorPago: 0,
  };

  describe("Pagamento exato", () => {
    it("cobreParcela = true quando paga o valor exato", () => {
      const res = liquidarParcelado({ ...baseParams, valorRecebido: 1200 });
      expect(res.cobreParcela).toBe(true);
    });

    it("novoSaldoRetido = 0 quando paga o valor exato", () => {
      const res = liquidarParcelado({ ...baseParams, valorRecebido: 1200 });
      expect(res.novoSaldoRetido).toBe(0);
    });

    it("percentParcela = 100 no pagamento exato", () => {
      const res = liquidarParcelado({ ...baseParams, valorRecebido: 1200 });
      expect(res.percentParcela).toBe(100);
    });
  });

  describe("Pagamento acima (excedente)", () => {
    it("cobreParcela = true e retém excedente", () => {
      // Paga 1700, parcela = 1200, excedente = 500
      const res = liquidarParcelado({ ...baseParams, valorRecebido: 1700 });
      expect(res.cobreParcela).toBe(true);
      expect(res.novoSaldoRetido).toBeCloseTo(500, 1);
    });

    it("excedente retido + próximo pagamento abate a próxima parcela", () => {
      // Saldo retido de 500 + paga 700 = total 1200 = cobre a parcela
      const res = liquidarParcelado({ ...baseParams, saldoRetido: 500, valorRecebido: 700 });
      expect(res.cobreParcela).toBe(true);
      expect(res.novoSaldoRetido).toBeCloseTo(0, 1);
    });
  });

  describe("Pagamento abaixo (inadimplência parcial)", () => {
    it("cobreParcela = false quando paga abaixo do valor", () => {
      const res = liquidarParcelado({ ...baseParams, valorRecebido: 800 });
      expect(res.cobreParcela).toBe(false);
    });

    it("percentParcela calculado corretamente (800/1200 ≈ 66.7%)", () => {
      const res = liquidarParcelado({ ...baseParams, valorRecebido: 800 });
      expect(res.percentParcela).toBeCloseTo(66.7, 0);
    });
  });

  describe("Pagamento com atraso", () => {
    it("adiciona juros de atraso ao total necessário", () => {
      // Sem atraso: precisa 1200. Com 3 dias atraso: 1200 + 1200*1%*3 = 1236
      const semAtraso = liquidarParcelado({ ...baseParams, valorRecebido: 1200 });
      const comAtraso  = liquidarParcelado({ ...baseParams, valorRecebido: 1200, diasAtraso: 3 });

      // Com atraso 1200 não cobre mais
      expect(semAtraso.cobreParcela).toBe(true);
      expect(comAtraso.cobreParcela).toBe(false);
      expect(comAtraso.jurosAtraso).toBeCloseTo(36, 1);
    });
  });
});

// ─── simularMensalRolavel ─────────────────────────────────────────────────────

describe("simularMensalRolavel", () => {
  it("retorna o número correto de períodos", () => {
    const res = simularMensalRolavel({ principal: 10000, taxaMensal: 10, meses: 6 });
    expect(res).toHaveLength(6);
  });

  it("o saldo de início permanece constante (pagamento só de juros)", () => {
    const res = simularMensalRolavel({ principal: 10000, taxaMensal: 30, meses: 3 });
    res.forEach((p) => {
      expect(p.saldoInicio).toBe(10000);
      expect(p.saldoSeJuros).toBe(10000);
    });
  });

  it("calcula os juros corretamente em cada período", () => {
    const res = simularMensalRolavel({ principal: 10000, taxaMensal: 30, meses: 3 });
    res.forEach((p) => {
      expect(p.juros).toBeCloseTo(3000, 1); // 10000 × 30%
      expect(p.totalDevido).toBeCloseTo(13000, 1);
      expect(p.paraQuitar).toBeCloseTo(13000, 1);
      expect(p.pagandoJuros).toBeCloseTo(3000, 1);
    });
  });

  it("os meses são numerados sequencialmente a partir de 1", () => {
    const res = simularMensalRolavel({ principal: 5000, taxaMensal: 10, meses: 4 });
    res.forEach((p, i) => {
      expect(p.mes).toBe(i + 1);
    });
  });
});
