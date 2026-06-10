/**
 * Testes unitários — lib/calculo/juros.ts
 *
 * Cobre:
 *  - calcularEmprestimo (simples, price, composto, taxa zero)
 *  - calcularJurosDiario
 *  - calcularPagamentoAntecipado
 *  - calcularJurosAtraso
 *  - calcularCET
 */

import {
  calcularEmprestimo,
  calcularJurosDiario,
  calcularPagamentoAntecipado,
  calcularJurosAtraso,
  calcularCET,
} from "@/lib/calculo/juros";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Arredonda para 2 casas decimais (igual à função interna) */
const arred = (n: number) => Math.round(n * 100) / 100;

/** Data base para os testes */
const BASE_DATE = new Date("2026-01-01T00:00:00.000Z");

// ─── calcularEmprestimo ───────────────────────────────────────────────────────

describe("calcularEmprestimo", () => {
  describe("tipo: simples", () => {
    const params = { valorPrincipal: 10000, taxaJuros: 30, numParcelas: 3, tipo: "simples" as const };

    it("retorna o número correto de parcelas", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.parcelas).toHaveLength(3);
    });

    it("calcula o total de juros simples corretamente", () => {
      // Juros simples: P × r × n = 10000 × 0.30 × 3 = 9000
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.totalJuros).toBe(9000);
    });

    it("calcula o valor total corretamente", () => {
      // valorTotal = principal + totalJuros = 19000
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.valorTotal).toBe(19000);
    });

    it("a soma das parcelas é igual ao valorTotal", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      const soma = arred(res.parcelas.reduce((acc, p) => acc + p.valorDevido, 0));
      expect(soma).toBeCloseTo(res.valorTotal, 1);
    });

    it("as datas de vencimento são espaçadas pelo intervalo informado", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      res.parcelas.forEach((p, i) => {
        const expectedDate = new Date(BASE_DATE);
        expectedDate.setDate(expectedDate.getDate() + 30 * (i + 1));
        expect(p.dataVencimento.toDateString()).toBe(expectedDate.toDateString());
      });
    });

    it("a última parcela absorve os centavos de arredondamento", () => {
      // Com 3 parcelas de 19000/3 = 6333.33... — a última cobre o restante
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      const somaAntes = arred(res.parcelas.slice(0, -1).reduce((acc, p) => acc + p.valorDevido, 0));
      const ultima = res.parcelas[res.parcelas.length - 1].valorDevido;
      expect(arred(somaAntes + ultima)).toBeCloseTo(res.valorTotal, 1);
    });

    it("retorna o valorPrincipal e taxaJuros inalterados", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.valorPrincipal).toBe(10000);
      expect(res.taxaJuros).toBe(30);
    });
  });

  describe("tipo: price", () => {
    const params = { valorPrincipal: 12000, taxaJuros: 5, numParcelas: 12, tipo: "price" as const };

    it("retorna 12 parcelas", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.parcelas).toHaveLength(12);
    });

    it("todas as parcelas têm o mesmo valorDevido (tabela Price)", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      const primeiro = res.parcelas[0].valorDevido;
      // Tolerância de 1 centavo para arredondamento
      res.parcelas.forEach((p) => {
        expect(Math.abs(p.valorDevido - primeiro)).toBeLessThanOrEqual(0.01);
      });
    });

    it("os juros decrescem ao longo do tempo (amortização crescente)", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      for (let i = 1; i < res.parcelas.length; i++) {
        expect(res.parcelas[i].valorJuros).toBeLessThanOrEqual(res.parcelas[i - 1].valorJuros + 0.01);
      }
    });

    it("o saldo devedor cai a zero na última parcela", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.parcelas[res.parcelas.length - 1].saldoDevedor).toBeCloseTo(0, 0);
    });
  });

  describe("tipo: composto", () => {
    const params = { valorPrincipal: 5000, taxaJuros: 10, numParcelas: 3, tipo: "composto" as const };

    it("calcula o total com juros compostos: P × (1+r)^n", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      const esperado = arred(5000 * Math.pow(1.1, 3));
      expect(res.valorTotal).toBeCloseTo(esperado, 1);
    });

    it("retorna 3 parcelas", () => {
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.parcelas).toHaveLength(3);
    });
  });

  describe("taxa zero", () => {
    it("sem juros — valorTotal = valorPrincipal", () => {
      const params = { valorPrincipal: 6000, taxaJuros: 0, numParcelas: 6, tipo: "simples" as const };
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.totalJuros).toBe(0);
      expect(res.valorTotal).toBe(6000);
    });

    it("price com taxa zero — parcelas iguais ao principal / n", () => {
      const params = { valorPrincipal: 6000, taxaJuros: 0, numParcelas: 6, tipo: "price" as const };
      const res = calcularEmprestimo(params, BASE_DATE, 30);
      expect(res.valorParcela).toBeCloseTo(1000, 0);
    });
  });
});

// ─── calcularJurosDiario ──────────────────────────────────────────────────────

describe("calcularJurosDiario", () => {
  const principal = 10000;
  const taxaMensal = 10; // 10% ao mês

  it("calcula a taxa diária como taxaMensal / 30", () => {
    const res = calcularJurosDiario(principal, taxaMensal);
    expect(res.taxaDiaria).toBeCloseTo(10 / 30, 5);
  });

  it("calcula juros por dia corretamente", () => {
    // jurosPorDia = 10000 × (0.10 / 30) = 33.33
    const res = calcularJurosDiario(principal, taxaMensal);
    expect(res.jurosPorDia).toBeCloseTo(33.33, 1);
  });

  it("totalJurosDias(30) ≈ juros de 1 mês inteiro", () => {
    const res = calcularJurosDiario(principal, taxaMensal);
    expect(res.totalJurosDias(30)).toBeCloseTo(1000, 0);
  });

  it("valorTotalDias(30) = principal + juros mensais", () => {
    const res = calcularJurosDiario(principal, taxaMensal);
    expect(res.valorTotalDias(30)).toBeCloseTo(11000, 0);
  });

  it("retorna zero juros com zero dias", () => {
    const res = calcularJurosDiario(principal, taxaMensal);
    expect(res.totalJurosDias(0)).toBe(0);
  });
});

// ─── calcularPagamentoAntecipado ──────────────────────────────────────────────

describe("calcularPagamentoAntecipado", () => {
  it("calcula dias antecipados e juros pro-rata", () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataVencimento = new Date(hoje);
    dataVencimento.setDate(hoje.getDate() + 10); // vence daqui 10 dias

    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() - 20); // período de 30 dias total

    const res = calcularPagamentoAntecipado(dataVencimento, dataInicio, 1300, 1000, 300, 10);

    expect(res.diasAntecipados).toBe(10);
    expect(res.diasUsados).toBe(20); // 30 - 10
    expect(res.descontoJuros).toBeGreaterThan(0);
    expect(res.valorComDesconto).toBeLessThan(1300);
  });

  it("sem antecipação (vencimento hoje) — sem desconto", () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() - 30);

    const res = calcularPagamentoAntecipado(hoje, dataInicio, 1300, 1000, 300, 10);

    expect(res.diasAntecipados).toBe(0);
    expect(res.descontoJuros).toBeGreaterThanOrEqual(0);
  });

  it("percentualDesconto está entre 0 e 100", () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataVencimento = new Date(hoje);
    dataVencimento.setDate(hoje.getDate() + 15);

    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() - 15);

    const res = calcularPagamentoAntecipado(dataVencimento, dataInicio, 1300, 1000, 300, 10);

    expect(res.percentualDesconto).toBeGreaterThanOrEqual(0);
    expect(res.percentualDesconto).toBeLessThanOrEqual(100);
  });
});

// ─── calcularJurosAtraso ──────────────────────────────────────────────────────

describe("calcularJurosAtraso", () => {
  it("retorna diasAtraso = 0 e jurosAtraso = 0 quando não há atraso", () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);

    const res = calcularJurosAtraso(1000, amanha, 1, "parcela");
    expect(res.diasAtraso).toBe(0);
    expect(res.jurosAtraso).toBe(0);
  });

  it("Regra A (parcela) — calcula juros sobre o valor total", () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 5); // 5 dias de atraso

    const res = calcularJurosAtraso(1000, ontem, 1, "parcela");
    // 1000 × 1% × 5 = 50
    expect(res.diasAtraso).toBe(5);
    expect(res.jurosAtraso).toBeCloseTo(50, 1);
    expect(res.valorAtualizado).toBeCloseTo(1050, 1);
  });

  it("Regra B (saldo) — comportamento idêntico ao A pois valorBase já é passado como saldo", () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 3);

    // Saldo restante = 600 (parte já foi paga)
    const res = calcularJurosAtraso(600, ontem, 1, "saldo");
    // 600 × 1% × 3 = 18
    expect(res.jurosAtraso).toBeCloseTo(18, 1);
  });

  it("taxa diária customizada funciona corretamente", () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 2); // 2 dias

    const res = calcularJurosAtraso(1000, ontem, 2, "parcela"); // 2% ao dia
    expect(res.jurosAtraso).toBeCloseTo(40, 1); // 1000 × 2% × 2
  });
});

// ─── calcularCET ──────────────────────────────────────────────────────────────

describe("calcularCET", () => {
  it("CET simples = taxa mensal × 12", () => {
    // 10% ao mês × 12 = 120%
    const cet = calcularCET(10, "simples");
    expect(cet).toBeCloseTo(120, 0);
  });

  it("CET por_parcela = taxa mensal × 12 (mesmo comportamento do simples)", () => {
    const cet = calcularCET(5, "por_parcela");
    expect(cet).toBeCloseTo(60, 0);
  });

  it("CET composto = (1 + r)^12 - 1", () => {
    // (1.1)^12 - 1 ≈ 213.84%
    const cet = calcularCET(10, "composto");
    expect(cet).toBeCloseTo(213.84, 0);
  });

  it("CET price = (1 + r)^12 - 1 (igual ao composto)", () => {
    const cet = calcularCET(10, "price");
    expect(cet).toBeCloseTo(213.84, 0);
  });

  it("CET com taxa 0% = 0%", () => {
    const cet = calcularCET(0, "simples");
    expect(cet).toBe(0);
  });
});
