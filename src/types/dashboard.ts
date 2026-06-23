export interface DashboardData {
  capital: number;
  recebidoMes: number;
  lucroMes: number;
  parcelasAtrasadas: number;
  totalClientesAtivos: number;
  lucroVendas: number;
  totalSemana: number;
  parcelasHoje: ParcelaHoje[];
  evolucaoMensal: EvolucaoMes[];
}

export interface ParcelaHoje {
  id: string;
  clienteNome: string;
  clientePhone: string;
  valorDevido: number;
  dataVencimento: string;
  status: "PENDENTE" | "ATRASADO" | "PAGO" | "PARCIAL";
}

export interface EvolucaoMes {
  mes: string;
  recebido: number;
}
