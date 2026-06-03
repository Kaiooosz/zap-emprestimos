export type TipoCalculo = "simples" | "por_parcela";

export interface ParamsEmprestimo {
  valorPrincipal: number;
  taxaJuros: number;      // percentual, ex: 10 = 10%
  numParcelas: number;
  tipo: TipoCalculo;
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

export interface ParcelaSimulada {
  numero: number;
  valorDevido: number;
  dataVencimento: Date;
}

export function calcularEmprestimo(
  params: ParamsEmprestimo,
  dataInicio: Date,
  intervaloEmDias: number = 30
): ResultadoEmprestimo {
  const { valorPrincipal, taxaJuros, numParcelas, tipo } = params;
  const taxa = taxaJuros / 100;

  let totalJuros: number;
  let valorTotal: number;

  if (tipo === "simples") {
    totalJuros = valorPrincipal * taxa * numParcelas;
    valorTotal = valorPrincipal + totalJuros;
  } else {
    totalJuros = valorPrincipal * taxa * numParcelas;
    valorTotal = valorPrincipal + totalJuros;
  }

  const valorParcela = arredondar(valorTotal / numParcelas);

  const parcelas: ParcelaSimulada[] = Array.from({ length: numParcelas }, (_, i) => {
    const dataVencimento = new Date(dataInicio);
    dataVencimento.setDate(dataVencimento.getDate() + intervaloEmDias * (i + 1));
    return {
      numero: i + 1,
      valorDevido: i === numParcelas - 1
        ? arredondar(valorTotal - valorParcela * (numParcelas - 1))
        : valorParcela,
      dataVencimento,
    };
  });

  return {
    valorPrincipal,
    taxaJuros,
    totalJuros: arredondar(totalJuros),
    valorTotal: arredondar(valorTotal),
    valorParcela,
    numParcelas,
    parcelas,
  };
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
