// In-memory store — funcional em dev. Conectar Prisma para produção.
import { calcularScoreCompleto } from "@/lib/score/calcularScore";

// ─── Tipos base ───────────────────────────────────────────────────────────────

export type Role = "ADMIN" | "COBRADOR" | "OPERADOR";
export type TipoEmprestimo = "DIARIO" | "SEMANAL" | "QUINZENAL" | "MENSAL";
export type StatusEmprestimo = "ATIVO" | "QUITADO" | "INADIMPLENTE" | "CANCELADO";
export type StatusParcela = "PENDENTE" | "PAGO" | "ATRASADO" | "PARCIAL";
export type CategoriaContaPagar = "ALUGUEL" | "SALARIO" | "IMPOSTO" | "SERVICO" | "MARKETING" | "TECNOLOGIA" | "OUTROS";
export type TipoProduto = "EMPRESTIMO" | "DESCONTO_CHEQUE" | "RENOVACAO" | "VENDA" | "ALUGUEL" | "ASSINATURA";
export type ModalidadeJuros = "SIMPLES" | "POR_PARCELA";
export type ModoPagamento = "COMPLETO" | "SOMENTE_JUROS" | "QUITACAO_TOTAL" | "ANTECIPADO" | "ABATIMENTO";
export type TipoCliente = "PESSOA_FISICA" | "PESSOA_JURIDICA";
export type TipoGarantia = "IMOVEL" | "VEICULO" | "CHEQUE" | "NOTA_PROMISSORIA" | "FIADOR" | "OUTRO";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  nome: string;
  tipo: TipoCliente;
  cpf?: string;
  cnpj?: string;
  phone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  profissao?: string;
  rendaMensal?: number;
  referencia?: string;       // fiador ou referência
  score: number;             // 0-1000
  temContrato: boolean;
  garantia: boolean;
  tipoGarantia?: TipoGarantia;
  valorGarantia?: number;
  descricaoGarantia?: string;
  observacoes?: string;
  perfilId?: string;
  createdAt: string;
}

export interface Emprestimo {
  id: string;
  clienteId: string;
  operadorId: string;
  tipoProduto: TipoProduto;      // natureza da operação
  tipo: TipoEmprestimo;          // periodicidade
  modalidadeJuros: ModalidadeJuros;
  status: StatusEmprestimo;
  valorPrincipal: number;
  taxaJuros: number;
  totalJuros: number;
  valorTotal: number;
  numParcelas: number;
  dataInicio: string;
  dataVencimento: string;
  observacoes?: string;
  // Garantias
  temGarantia: boolean;
  tipoGarantia?: TipoGarantia;
  valorGarantia?: number;
  temContrato: boolean;
  // Campos específicos por tipo
  taxaRenovacao?: number;         // RENOVACAO
  valorNominalCheque?: number;    // DESCONTO_CHEQUE
  dataCheque?: string;            // DESCONTO_CHEQUE
  custo?: number;                 // VENDA (custo do produto)
  lucro?: number;                 // VENDA (margem de lucro)
  descricaoProduto?: string;      // VENDA
  diaVencimento?: number;         // ALUGUEL (1-31)
  semDataFim?: boolean;           // ALUGUEL
  createdAt: string;
}

export interface Parcela {
  id: string;
  emprestimoId: string;
  numero: number;
  valorDevido: number;
  valorPrincipal: number;     // parcela de principal
  valorJuros: number;         // parcela de juros
  valorPago?: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusParcela;
  modoPagamento?: ModoPagamento;
  descontoAntecipado?: number; // valor de desconto dado no pagamento antecipado
  diasAntecipados?: number;    // quantos dias antes do vencimento foi pago
  jurosAtrasoAcumulado?: number; // juros de atraso calculados no momento do pagamento
  principalAbatido?: number;     // quanto do principal foi abatido neste pagamento
}

// ─── Perfil Financeiro ────────────────────────────────────────────────────────

export interface PerfilFinanceiro {
  id: string;
  nome: string;
  modalidades: ("MODALIDADE_1" | "MODALIDADE_2")[];
  taxaMensalPct: number;
  regraAtraso: "A" | "B";
  taxaDiariaAtrasoPct: number;
  prazoMaxParcelado: number;
  limiteEmprestimo: number;
  permitirRenovacao: boolean;
  maxRenovacoes: number;
  descontoQuitacaoMaxPct: number;
}

export interface ContaPagar {
  id: string;
  descricao: string;
  categoria: CategoriaContaPagar;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: "PENDENTE" | "PAGO" | "VENCIDO";
  recorrente: boolean;
  createdAt: string;
}

export interface Membro {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
}
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString();
}
function arr(n: number) { return Array.from({ length: n }); }

// ─── Dados iniciais ───────────────────────────────────────────────────────────

const _perfis: PerfilFinanceiro[] = [
  {
    id: "pf1",
    nome: "Padrao",
    modalidades: ["MODALIDADE_1", "MODALIDADE_2"],
    taxaMensalPct: 10,
    regraAtraso: "A",
    taxaDiariaAtrasoPct: 1,
    prazoMaxParcelado: 12,
    limiteEmprestimo: 10000,
    permitirRenovacao: true,
    maxRenovacoes: 3,
    descontoQuitacaoMaxPct: 10,
  },
  {
    id: "pf2",
    nome: "Premium",
    modalidades: ["MODALIDADE_1", "MODALIDADE_2"],
    taxaMensalPct: 8,
    regraAtraso: "B",
    taxaDiariaAtrasoPct: 0.5,
    prazoMaxParcelado: 24,
    limiteEmprestimo: 50000,
    permitirRenovacao: true,
    maxRenovacoes: 0,
    descontoQuitacaoMaxPct: 20,
  },
  {
    id: "pf3",
    nome: "Risco Alto",
    modalidades: ["MODALIDADE_1"],
    taxaMensalPct: 15,
    regraAtraso: "A",
    taxaDiariaAtrasoPct: 1.5,
    prazoMaxParcelado: 6,
    limiteEmprestimo: 3000,
    permitirRenovacao: false,
    maxRenovacoes: 0,
    descontoQuitacaoMaxPct: 5,
  },
];

const _clientes: Cliente[] = [
  { id: "c1", nome: "João Silva",       tipo: "PESSOA_FISICA",   cpf: "123.456.789-01", phone: "(11) 99999-0001", email: "joao@email.com",     cidade: "São Paulo",   profissao: "Comerciante",  rendaMensal: 5000, score: 820, temContrato: true,  garantia: true,  tipoGarantia: "VEICULO",           valorGarantia: 15000, descricaoGarantia: "Honda Civic 2019", createdAt: daysAgo(120) },
  { id: "c2", nome: "Maria Oliveira",   tipo: "PESSOA_FISICA",   cpf: "234.567.890-02", phone: "(11) 98888-0002", email: "maria@email.com",    cidade: "Campinas",    profissao: "Autônoma",     rendaMensal: 3200, score: 620, temContrato: true,  garantia: false,                                                                                  createdAt: daysAgo(90) },
  { id: "c3", nome: "Carlos Santos",    tipo: "PESSOA_FISICA",   cpf: "345.678.901-03", phone: "(11) 97777-0003",                              cidade: "Santo André", profissao: "Vendedor",     rendaMensal: 2000, score: 280, temContrato: false, garantia: false,                                                                                  createdAt: daysAgo(60) },
  { id: "c4", nome: "Ana Lima",         tipo: "PESSOA_FISICA",   cpf: "456.789.012-04", phone: "(11) 96666-0004", email: "ana@email.com",      cidade: "São Paulo",   profissao: "Empresária",   rendaMensal: 12000,score: 950, temContrato: true,  garantia: true,  tipoGarantia: "IMOVEL",            valorGarantia: 350000,descricaoGarantia: "Apartamento 70m²", createdAt: daysAgo(200) },
  { id: "c5", nome: "Roberto Ferreira", tipo: "PESSOA_FISICA",   cpf: "567.890.123-05", phone: "(11) 95555-0005",                              cidade: "Guarulhos",   profissao: "Motorista",    rendaMensal: 4500, score: 710, temContrato: true,  garantia: false,                                                                                  createdAt: daysAgo(45) },
  { id: "c6", nome: "Patricia Costa",   tipo: "PESSOA_FISICA",   cpf: "678.901.234-06", phone: "(11) 94444-0006", email: "patricia@email.com", cidade: "Osasco",      profissao: "Cabeleireira", rendaMensal: 2800, score: 450, temContrato: false, garantia: true,  tipoGarantia: "NOTA_PROMISSORIA",  valorGarantia: 600,   descricaoGarantia: "NP assinada",      createdAt: daysAgo(30) },
];

const _emprestimos: Emprestimo[] = [
  { id: "e1", clienteId: "c1", operadorId: "u1", tipoProduto: "EMPRESTIMO",      tipo: "MENSAL",    modalidadeJuros: "SIMPLES",      status: "ATIVO",        valorPrincipal: 2000, taxaJuros: 10, totalJuros: 1200, valorTotal: 3200, numParcelas: 6,  dataInicio: daysAgo(90),  dataVencimento: daysFromNow(90),  temGarantia: true,  tipoGarantia: "VEICULO",   valorGarantia: 15000, temContrato: true,  createdAt: daysAgo(90) },
  { id: "e2", clienteId: "c2", operadorId: "u1", tipoProduto: "EMPRESTIMO",      tipo: "SEMANAL",   modalidadeJuros: "POR_PARCELA",  status: "ATIVO",        valorPrincipal: 1500, taxaJuros: 15, totalJuros: 2250, valorTotal: 3750, numParcelas: 10, dataInicio: daysAgo(50),  dataVencimento: daysFromNow(20),  temGarantia: false, temContrato: true,  createdAt: daysAgo(50) },
  { id: "e3", clienteId: "c3", operadorId: "u1", tipoProduto: "EMPRESTIMO",      tipo: "MENSAL",    modalidadeJuros: "SIMPLES",      status: "INADIMPLENTE", valorPrincipal: 800,  taxaJuros: 20, totalJuros: 640,  valorTotal: 1440, numParcelas: 4,  dataInicio: daysAgo(120), dataVencimento: daysAgo(30),      temGarantia: false, temContrato: false, createdAt: daysAgo(120) },
  { id: "e4", clienteId: "c4", operadorId: "u1", tipoProduto: "EMPRESTIMO",      tipo: "MENSAL",    modalidadeJuros: "SIMPLES",      status: "QUITADO",      valorPrincipal: 5000, taxaJuros: 8,  totalJuros: 4800, valorTotal: 9800, numParcelas: 12, dataInicio: daysAgo(360), dataVencimento: daysAgo(1),       temGarantia: true,  tipoGarantia: "IMOVEL",    valorGarantia: 350000,temContrato: true,  createdAt: daysAgo(360) },
  { id: "e5", clienteId: "c5", operadorId: "u1", tipoProduto: "EMPRESTIMO",      tipo: "MENSAL",    modalidadeJuros: "POR_PARCELA",  status: "ATIVO",        valorPrincipal: 1200, taxaJuros: 12, totalJuros: 864,  valorTotal: 2064, numParcelas: 6,  dataInicio: daysAgo(60),  dataVencimento: daysFromNow(120), temGarantia: false, temContrato: true,  createdAt: daysAgo(60) },
  { id: "e6", clienteId: "c6", operadorId: "u1", tipoProduto: "DESCONTO_CHEQUE", tipo: "QUINZENAL", modalidadeJuros: "POR_PARCELA",  status: "ATIVO",        valorPrincipal: 600,  taxaJuros: 8,  totalJuros: 192,  valorTotal: 792,  numParcelas: 4,  dataInicio: daysAgo(30),  dataVencimento: daysFromNow(30),  temGarantia: true,  tipoGarantia: "CHEQUE",    valorGarantia: 792,   temContrato: false, valorNominalCheque: 792, dataCheque: daysFromNow(60), createdAt: daysAgo(30) },
];

function gerarParcelas(e: Emprestimo): Parcela[] {
  const intervaloMap: Record<TipoEmprestimo, number> = { DIARIO: 1, SEMANAL: 7, QUINZENAL: 15, MENSAL: 30 };
  const intervalo = intervaloMap[e.tipo];
  const valorParcela = Math.round((e.valorTotal / e.numParcelas) * 100) / 100;
  const valorJurosParcela = Math.round((e.totalJuros / e.numParcelas) * 100) / 100;
  const valorPrincipalParcela = Math.round((e.valorPrincipal / e.numParcelas) * 100) / 100;

  return arr(e.numParcelas).map((_, i) => {
    const dataBase = new Date(e.dataInicio);
    dataBase.setDate(dataBase.getDate() + intervalo * (i + 1));
    const venc = dataBase.toISOString();
    const hoje = new Date();
    let status: StatusParcela, dataPagamento: string | undefined, valorPago: number | undefined;

    if (e.status === "QUITADO") {
      status = "PAGO";
      const pago = new Date(venc); pago.setDate(pago.getDate() - 2);
      dataPagamento = pago.toISOString(); valorPago = valorParcela;
    } else if (e.status === "INADIMPLENTE") {
      status = dataBase < hoje ? "ATRASADO" : "PENDENTE";
    } else {
      const diasPassados = Math.floor((hoje.getTime() - new Date(e.dataInicio).getTime()) / 86400000);
      if (intervalo * (i + 1) < diasPassados - 5) {
        status = "PAGO"; dataPagamento = venc; valorPago = valorParcela;
      } else if (dataBase < hoje) {
        status = "ATRASADO";
      } else {
        status = "PENDENTE";
      }
    }

    const isLast = i === e.numParcelas - 1;
    return {
      id: `${e.id}-p${i + 1}`,
      emprestimoId: e.id,
      numero: i + 1,
      valorDevido: isLast ? Math.round((e.valorTotal - valorParcela * (e.numParcelas - 1)) * 100) / 100 : valorParcela,
      valorPrincipal: isLast ? Math.round((e.valorPrincipal - valorPrincipalParcela * (e.numParcelas - 1)) * 100) / 100 : valorPrincipalParcela,
      valorJuros: isLast ? Math.round((e.totalJuros - valorJurosParcela * (e.numParcelas - 1)) * 100) / 100 : valorJurosParcela,
      valorPago,
      dataVencimento: venc,
      dataPagamento,
      status,
    };
  });
}

const _parcelas: Parcela[] = _emprestimos.flatMap(gerarParcelas);

const _contas: ContaPagar[] = [
  { id: "cp1", descricao: "Aluguel escritório",    categoria: "ALUGUEL",    valor: 2500, dataVencimento: daysFromNow(5),  status: "PENDENTE", recorrente: true, createdAt: daysAgo(30) },
  { id: "cp2", descricao: "Servidor Neon + Vercel",categoria: "TECNOLOGIA", valor: 180,  dataVencimento: daysFromNow(10), status: "PENDENTE", recorrente: true, createdAt: daysAgo(30) },
  { id: "cp3", descricao: "Salário Cobrador",       categoria: "SALARIO",    valor: 1800, dataVencimento: daysFromNow(2),  status: "PENDENTE", recorrente: true, createdAt: daysAgo(30) },
  { id: "cp4", descricao: "Simples Nacional",       categoria: "IMPOSTO",    valor: 320,  dataVencimento: daysAgo(5),     status: "VENCIDO",  recorrente: true, createdAt: daysAgo(35) },
  { id: "cp5", descricao: "Contabilidade",          categoria: "SERVICO",    valor: 650,  dataVencimento: daysAgo(15),    status: "PAGO", dataPagamento: daysAgo(14), recorrente: true, createdAt: daysAgo(45) },
];

const _membros: Membro[] = [
  { id: "u1", name: "Admin Zap",          email: "admin@zap.com",    phone: "(11) 99000-0001", role: "ADMIN",    active: true, createdAt: daysAgo(365) },
  { id: "u2", name: "Lucas Cobrador",     email: "lucas@zap.com",    phone: "(11) 99000-0002", role: "COBRADOR", active: true, createdAt: daysAgo(180) },
  { id: "u3", name: "Fernanda Operadora", email: "fernanda@zap.com", phone: "(11) 99000-0003", role: "OPERADOR", active: true, createdAt: daysAgo(90) },
];

// ─── Score helper ─────────────────────────────────────────────────────────────

function recalcularScoreCliente(clienteId: string) {
  const emps = _emprestimos.filter((e) => e.clienteId === clienteId);
  const parts = _parcelas.filter((p) => emps.find((e) => e.id === p.emprestimoId));
  const resultado = calcularScoreCompleto(parts, emps);
  const idx = _clientes.findIndex((c) => c.id === clienteId);
  if (idx >= 0) _clientes[idx].score = resultado.score;
  return resultado.score;
}

// ─── Store API ────────────────────────────────────────────────────────────────

export const store = {
  clientes: {
    list: () => [..._clientes].sort((a, b) => b.score - a.score),
    get: (id: string) => _clientes.find((c) => c.id === id),
    create: (data: Omit<Cliente, "id" | "score" | "createdAt">): Cliente => {
      const c: Cliente = { ...data, id: uid(), score: 500, createdAt: new Date().toISOString() };
      _clientes.push(c);
      return c;
    },
    update: (id: string, data: Partial<Cliente>): Cliente | null => {
      const idx = _clientes.findIndex((c) => c.id === id);
      if (idx < 0) return null;
      _clientes[idx] = { ..._clientes[idx], ...data };
      return _clientes[idx];
    },
    delete: (id: string): boolean => {
      const idx = _clientes.findIndex((c) => c.id === id);
      if (idx < 0) return false;
      _clientes.splice(idx, 1);
      return true;
    },
    getScore: (id: string) => {
      const emps = _emprestimos.filter((e) => e.clienteId === id);
      const parts = _parcelas.filter((p) => emps.find((e) => e.id === p.emprestimoId));
      return calcularScoreCompleto(parts, emps);
    },
  },

  emprestimos: {
    list: (clienteId?: string) =>
      [..._emprestimos]
        .filter((e) => !clienteId || e.clienteId === clienteId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    get: (id: string) => _emprestimos.find((e) => e.id === id),
    create: (
      data: Omit<Emprestimo, "id" | "createdAt" | "totalJuros" | "valorTotal">,
      parcelasData: Array<{ numero: number; valorDevido: number; valorPrincipal: number; valorJuros: number; dataVencimento: string }>
    ): Emprestimo => {
      const taxa = data.taxaJuros / 100;
      let totalJuros: number;
      if (data.modalidadeJuros === "POR_PARCELA") {
        totalJuros = data.valorPrincipal * taxa * data.numParcelas;
      } else {
        totalJuros = data.valorPrincipal * taxa * data.numParcelas;
      }
      const valorTotal = data.valorPrincipal + totalJuros;
      const e: Emprestimo = { ...data, id: uid(), totalJuros, valorTotal, createdAt: new Date().toISOString() };
      _emprestimos.push(e);
      parcelasData.forEach((p) => _parcelas.push({
        ...p,
        id: uid(),
        emprestimoId: e.id,
        status: "PENDENTE",
      }));
      return e;
    },
    updateStatus: (id: string, status: StatusEmprestimo): Emprestimo | null => {
      const idx = _emprestimos.findIndex((e) => e.id === id);
      if (idx < 0) return null;
      _emprestimos[idx] = { ..._emprestimos[idx], status };
      return _emprestimos[idx];
    },
  },

  parcelas: {
    list: (emprestimoId?: string) =>
      [..._parcelas]
        .filter((p) => !emprestimoId || p.emprestimoId === emprestimoId)
        .sort((a, b) => a.numero - b.numero),
    get: (id: string) => _parcelas.find((p) => p.id === id),

    // Registra pagamento (suporta 4 modos + ABATIMENTO)
    pagar: (
      id: string,
      valorPago: number,
      modo: ModoPagamento = "COMPLETO",
      extras?: { descontoAntecipado?: number; diasAntecipados?: number; valorRecebido?: number }
    ): Parcela | null => {
      const idx = _parcelas.findIndex((p) => p.id === id);
      if (idx < 0) return null;
      const parcela = _parcelas[idx];

      if (modo === "ABATIMENTO") {
        const valorRecebido = extras?.valorRecebido ?? valorPago;
        const hoje = new Date();

        // Calcula juros de atraso se parcela atrasada
        let jurosAtraso = 0;
        if (parcela.status === "ATRASADO") {
          const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - new Date(parcela.dataVencimento).getTime()) / 86400000));
          jurosAtraso = Math.round(parcela.valorDevido * 0.01 * diasAtraso * 100) / 100;
        }

        let restante = valorRecebido;
        let jurosAtrasoAcumulado = 0;
        let jurosCobertos = 0;
        let principalAbatido = 0;

        // 1. Cobre juros de atraso
        if (jurosAtraso > 0 && restante > 0) {
          jurosAtrasoAcumulado = Math.min(jurosAtraso, restante);
          restante = Math.round((restante - jurosAtrasoAcumulado) * 100) / 100;
        }

        // 2. Cobre juros mensais da parcela
        if (restante > 0) {
          jurosCobertos = Math.min(parcela.valorJuros, restante);
          restante = Math.round((restante - jurosCobertos) * 100) / 100;
        }

        // 3. Restante abate principal
        if (restante > 0) {
          principalAbatido = Math.min(parcela.valorPrincipal, restante);
          restante = Math.round((restante - principalAbatido) * 100) / 100;
        }

        const totalCoberto = Math.round((valorRecebido - restante) * 100) / 100;
        const statusNovo: StatusParcela = totalCoberto >= parcela.valorDevido ? "PAGO" : "PARCIAL";

        _parcelas[idx] = {
          ...parcela,
          valorPago: totalCoberto,
          dataPagamento: hoje.toISOString(),
          status: statusNovo,
          modoPagamento: "ABATIMENTO",
          jurosAtrasoAcumulado,
          principalAbatido,
        };

        // Se abateu principal: atualiza valorDevido das próximas parcelas pro-rata
        if (principalAbatido > 0) {
          const empAtual = _emprestimos.find((e) => e.id === parcela.emprestimoId);
          const proximas = _parcelas.filter(
            (p) => p.emprestimoId === parcela.emprestimoId &&
              p.numero > parcela.numero &&
              ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status)
          );
          if (proximas.length > 0 && empAtual) {
            const abatimentoPorParcela = Math.round((principalAbatido / proximas.length) * 100) / 100;
            proximas.forEach((pp) => {
              const ppIdx = _parcelas.findIndex((x) => x.id === pp.id);
              if (ppIdx >= 0) {
                const novoDevido = Math.max(0, Math.round((_parcelas[ppIdx].valorDevido - abatimentoPorParcela) * 100) / 100);
                const novoPrincipal = Math.max(0, Math.round((_parcelas[ppIdx].valorPrincipal - abatimentoPorParcela) * 100) / 100);
                _parcelas[ppIdx] = { ..._parcelas[ppIdx], valorDevido: novoDevido, valorPrincipal: novoPrincipal };
              }
            });
          }
        }

        if (statusNovo === "PAGO") {
          const empParcelas = _parcelas.filter((p) => p.emprestimoId === parcela.emprestimoId);
          if (empParcelas.every((p) => p.status === "PAGO")) {
            const eIdx = _emprestimos.findIndex((e) => e.id === parcela.emprestimoId);
            if (eIdx >= 0) _emprestimos[eIdx].status = "QUITADO";
          }
        }

        const empAb = _emprestimos.find((e) => e.id === parcela.emprestimoId);
        if (empAb) recalcularScoreCliente(empAb.clienteId);
        return _parcelas[idx];
      }

      if (modo === "ANTECIPADO") {
        // Pagamento antecipado com desconto pro-rata nos juros
        _parcelas[idx] = {
          ...parcela,
          valorPago,
          dataPagamento: new Date().toISOString(),
          status: "PAGO",
          modoPagamento: "ANTECIPADO",
          descontoAntecipado: extras?.descontoAntecipado,
          diasAntecipados:    extras?.diasAntecipados,
        };
        const empId2 = parcela.emprestimoId;
        const empParcs2 = _parcelas.filter((p) => p.emprestimoId === empId2);
        if (empParcs2.every((p) => p.status === "PAGO")) {
          const eIdx2 = _emprestimos.findIndex((e) => e.id === empId2);
          if (eIdx2 >= 0) _emprestimos[eIdx2].status = "QUITADO";
        }
        const emp2 = _emprestimos.find((e) => e.id === empId2);
        if (emp2) recalcularScoreCliente(emp2.clienteId);
        return _parcelas[idx];
      }

      if (modo === "SOMENTE_JUROS") {
        // Paga apenas os juros — adia o principal para a próxima parcela
        _parcelas[idx] = {
          ...parcela,
          valorPago: parcela.valorJuros,
          dataPagamento: new Date().toISOString(),
          status: "PARCIAL",
          modoPagamento: "SOMENTE_JUROS",
        };
        // Transfere o principal para a próxima parcela
        const nextIdx = _parcelas.findIndex(
          (p) => p.emprestimoId === parcela.emprestimoId && p.numero === parcela.numero + 1
        );
        if (nextIdx >= 0) {
          _parcelas[nextIdx] = {
            ..._parcelas[nextIdx],
            valorDevido: Math.round((_parcelas[nextIdx].valorDevido + parcela.valorPrincipal) * 100) / 100,
            valorPrincipal: Math.round((_parcelas[nextIdx].valorPrincipal + parcela.valorPrincipal) * 100) / 100,
          };
        }
        return _parcelas[idx];
      }

      if (modo === "QUITACAO_TOTAL") {
        // Quita todas as parcelas pendentes do empréstimo
        const empId = parcela.emprestimoId;
        _parcelas.forEach((p, i) => {
          if (p.emprestimoId === empId && ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status)) {
            _parcelas[i] = {
              ...p,
              valorPago: p.valorDevido,
              dataPagamento: new Date().toISOString(),
              status: "PAGO",
              modoPagamento: "QUITACAO_TOTAL",
            };
          }
        });
        const eIdx = _emprestimos.findIndex((e) => e.id === empId);
        if (eIdx >= 0) _emprestimos[eIdx].status = "QUITADO";
        const emp = _emprestimos[eIdx];
        if (emp) recalcularScoreCliente(emp.clienteId);
        return _parcelas[idx];
      }

      // COMPLETO — normal
      _parcelas[idx] = {
        ...parcela,
        valorPago,
        dataPagamento: new Date().toISOString(),
        status: "PAGO",
        modoPagamento: "COMPLETO",
      };
      const empId = parcela.emprestimoId;
      const empParcelas = _parcelas.filter((p) => p.emprestimoId === empId);
      if (empParcelas.every((p) => p.status === "PAGO")) {
        const eIdx = _emprestimos.findIndex((e) => e.id === empId);
        if (eIdx >= 0) _emprestimos[eIdx].status = "QUITADO";
      }
      const emp = _emprestimos.find((e) => e.id === empId);
      if (emp) recalcularScoreCliente(emp.clienteId);
      return _parcelas[idx];
    },

    marcarAtrasadas: () => {
      const hoje = new Date();
      _parcelas.forEach((p, idx) => {
        if (p.status === "PENDENTE" && new Date(p.dataVencimento) < hoje) {
          _parcelas[idx].status = "ATRASADO";
        }
      });
    },

    getSaldoDevedor: (emprestimoId: string): number =>
      _parcelas
        .filter((p) => p.emprestimoId === emprestimoId && ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status))
        .reduce((s, p) => s + p.valorDevido, 0),
  },

  contas: {
    list: () => [..._contas].sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()),
    create: (data: Omit<ContaPagar, "id" | "createdAt">): ContaPagar => {
      const c: ContaPagar = { ...data, id: uid(), createdAt: new Date().toISOString() };
      _contas.push(c);
      return c;
    },
    pagar: (id: string): ContaPagar | null => {
      const idx = _contas.findIndex((c) => c.id === id);
      if (idx < 0) return null;
      _contas[idx] = { ..._contas[idx], status: "PAGO", dataPagamento: new Date().toISOString() };
      return _contas[idx];
    },
    delete: (id: string): boolean => {
      const idx = _contas.findIndex((c) => c.id === id);
      if (idx < 0) return false;
      _contas.splice(idx, 1);
      return true;
    },
  },

  membros: {
    list: () => [..._membros],
    create: (data: Omit<Membro, "id" | "createdAt">): Membro => {
      const m: Membro = { ...data, id: uid(), createdAt: new Date().toISOString() };
      _membros.push(m);
      return m;
    },
    update: (id: string, data: Partial<Membro>): Membro | null => {
      const idx = _membros.findIndex((m) => m.id === id);
      if (idx < 0) return null;
      _membros[idx] = { ..._membros[idx], ...data };
      return _membros[idx];
    },
  },

  dashboard: {
    get: () => {
      store.parcelas.marcarAtrasadas();
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes   = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1);
      const fimSemana    = new Date(inicioSemana); fimSemana.setDate(inicioSemana.getDate() + 6);

      const capitalNaRua = _parcelas
        .filter((p) => ["PENDENTE","ATRASADO"].includes(p.status) && _emprestimos.find((e) => e.id === p.emprestimoId && e.status === "ATIVO"))
        .reduce((s, p) => s + p.valorDevido, 0);

      const parcelasPagasMes = _parcelas.filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= inicioMes && new Date(p.dataPagamento) <= fimMes);
      const recebidoMes = parcelasPagasMes.reduce((s, p) => s + (p.valorPago ?? 0), 0);
      const lucroMes = parcelasPagasMes.reduce((s, p) => {
        const emp = _emprestimos.find((e) => e.id === p.emprestimoId);
        return emp ? s + emp.totalJuros / emp.numParcelas : s;
      }, 0);

      const parcelasAtrasadas = _parcelas.filter((p) => p.status === "ATRASADO").length;
      const totalClientesAtivos = new Set(_emprestimos.filter((e) => e.status === "ATIVO").map((e) => e.clienteId)).size;

      const parcelasHoje = _parcelas
        .filter((p) => { const v = new Date(p.dataVencimento); return v.toDateString() === hoje.toDateString() && ["PENDENTE","ATRASADO"].includes(p.status); })
        .slice(0, 10)
        .map((p) => {
          const emp = _emprestimos.find((e) => e.id === p.emprestimoId)!;
          const c   = _clientes.find((c) => c.id === emp?.clienteId)!;
          return { id: p.id, clienteNome: c?.nome ?? "—", clientePhone: c?.phone ?? "—", valorDevido: p.valorDevido, dataVencimento: p.dataVencimento, status: p.status };
        });

      const totalSemana = _parcelas
        .filter((p) => { const v = new Date(p.dataVencimento); return v >= inicioSemana && v <= fimSemana && ["PENDENTE","ATRASADO"].includes(p.status); })
        .reduce((s, p) => s + p.valorDevido, 0);

      const evolucaoMensal = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        const ini = new Date(d.getFullYear(), d.getMonth(), 1);
        const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const recebido = _parcelas
          .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= ini && new Date(p.dataPagamento) <= fim)
          .reduce((s, p) => s + (p.valorPago ?? 0), 0);
        return { mes: ini.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), recebido };
      });

      // Projecoes financeiras
      const lucroPrevisto = _parcelas
        .filter((p) => ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status))
        .reduce((s, p) => s + p.valorJuros, 0);

      const inadimplentesIds = new Set(
        _emprestimos.filter((e) => e.status === "INADIMPLENTE").map((e) => e.id)
      );
      const capitalEmRisco = _parcelas
        .filter((p) => inadimplentesIds.has(p.emprestimoId) && ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status))
        .reduce((s, p) => s + p.valorDevido, 0);

      const vencendoHoje = _parcelas
        .filter((p) => { const v = new Date(p.dataVencimento); return v.toDateString() === hoje.toDateString() && ["PENDENTE", "ATRASADO"].includes(p.status); })
        .reduce((s, p) => s + p.valorDevido, 0);

      const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
      const recebidoOntem = _parcelas
        .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento).toDateString() === ontem.toDateString())
        .reduce((s, p) => s + (p.valorPago ?? 0), 0);

      const h30 = new Date(hoje); h30.setDate(hoje.getDate() - 30);
      const pagamentos30d = _parcelas
        .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= h30)
        .reduce((s, p) => s + (p.valorPago ?? 0), 0);
      const mediaRecebimentoDiario = Math.round((pagamentos30d / 30) * 100) / 100;

      const projecoes = {
        lucroPrevisto: Math.round(lucroPrevisto * 100) / 100,
        capitalEmRisco: Math.round(capitalEmRisco * 100) / 100,
        vencendoHoje: Math.round(vencendoHoje * 100) / 100,
        vencendoSemana: totalSemana,
        recebidoOntem: Math.round(recebidoOntem * 100) / 100,
        mediaRecebimentoDiario,
      };

      return { capitalNaRua, recebidoMes, lucroMes: Math.round(lucroMes * 100) / 100, parcelasAtrasadas, totalClientesAtivos, lucroVendas: 0, totalSemana, parcelasHoje, evolucaoMensal, projecoes };
    },
  },
};

// ─── Templates de Mensagem ────────────────────────────────────────────────────

export interface TemplateMsg {
  id: string;
  nome: string;
  tipo: "LEMBRETE" | "COBRANCA" | "ATRASO" | "QUITACAO" | "BOAS_VINDAS";
  conteudo: string;  // Markdown com variáveis {{nome}}, {{valor}}, etc.
  ativo: boolean;
  createdAt: string;
}

const _templates: TemplateMsg[] = [
  {
    id: "t1",
    nome: "Lembrete de Vencimento",
    tipo: "LEMBRETE",
    ativo: true,
    createdAt: daysAgo(30),
    conteudo: `Olá, *{{nome}}*!

Passando para lembrar que sua parcela *{{numero}}* no valor de *{{valor}}* vence em *{{vencimento}}*.

Realize o pagamento até a data para manter seu score em dia.

_Zap Empréstimos — sua credibilidade em primeiro lugar._`,
  },
  {
    id: "t2",
    nome: "Cobrança Padrão",
    tipo: "COBRANCA",
    ativo: true,
    createdAt: daysAgo(30),
    conteudo: `Olá, *{{nome}}*!

Identificamos que sua parcela *{{numero}}* de *{{valor}}* com vencimento em *{{vencimento}}* ainda está em aberto.

Por favor, regularize para evitar juros e impacto no seu score.

Entre em contato para negociar: *{{telefone_empresa}}*

_Zap Empréstimos_`,
  },
  {
    id: "t3",
    nome: "Cobrança — Atraso Grave",
    tipo: "ATRASO",
    ativo: true,
    createdAt: daysAgo(30),
    conteudo: `*{{nome}}*, atenção!

Sua dívida está em atraso há *{{dias_atraso}} dias*.

Valor atualizado: *{{valor}}*

Regularize hoje para evitar medidas administrativas e proteção em cadastros de inadimplência.

Fale conosco agora: *{{telefone_empresa}}*`,
  },
  {
    id: "t4",
    nome: "Confirmação de Quitação",
    tipo: "QUITACAO",
    ativo: true,
    createdAt: daysAgo(30),
    conteudo: `Parabéns, *{{nome}}*!

Seu empréstimo foi *quitado com sucesso*!

Valor total pago: *{{valor_total}}*
Data: *{{data_pagamento}}*

Obrigado pela confiança. Seu score foi atualizado.

_Zap Empréstimos — sempre com você._`,
  },
  {
    id: "t5",
    nome: "Boas-Vindas",
    tipo: "BOAS_VINDAS",
    ativo: true,
    createdAt: daysAgo(30),
    conteudo: `Olá, *{{nome}}*! Bem-vindo(a) à Zap Empréstimos!

Seu contrato foi criado com sucesso:
• Valor: *{{valor_principal}}*
• Parcelas: *{{num_parcelas}}x de {{valor_parcela}}*
• Primeira parcela: *{{primeiro_vencimento}}*

Qualquer dúvida, estamos à disposição.

_Zap Empréstimos_`,
  },
];

// ─── Configurações do Sistema ─────────────────────────────────────────────────

export interface ConfigEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  taxaJurosPadrao: number;
  limiteEmprestimoMin: number;
  limiteEmprestimoMax: number;
}

export interface ConfigWhatsApp {
  apiUrl: string;
  apiKey: string;
  instance: string;
  status: "CONECTADO" | "DESCONECTADO" | "NAO_CONFIGURADO";
  numeroBusiness: string;
  notificacoes7h: boolean;
  notificacoes8h: boolean;
  notificacoes12h: boolean;
  enviarBemVindas: boolean;
  enviarLembrete3dias: boolean;
  enviarQuitacao: boolean;
}

let _configEmpresa: ConfigEmpresa = {
  razaoSocial: "Zap Empréstimos LTDA",
  nomeFantasia: "Zap Empréstimos",
  cnpj: "00.000.000/0001-00",
  telefone: "(11) 99000-0000",
  email: "contato@zapemprestimos.com.br",
  endereco: "Rua das Finanças, 100 — São Paulo/SP",
  taxaJurosPadrao: 10,
  limiteEmprestimoMin: 200,
  limiteEmprestimoMax: 50000,
};

let _configWhatsApp: ConfigWhatsApp = {
  apiUrl: "",
  apiKey: "",
  instance: "",
  status: "NAO_CONFIGURADO",
  numeroBusiness: "",
  notificacoes7h: true,
  notificacoes8h: true,
  notificacoes12h: true,
  enviarBemVindas: true,
  enviarLembrete3dias: true,
  enviarQuitacao: true,
};

// ─── Extensão do store com novas entidades ────────────────────────────────────

export const storeExt = {
  perfis: {
    list: () => [..._perfis],
    get: (id: string) => _perfis.find((p) => p.id === id),
    create: (data: Omit<PerfilFinanceiro, "id">): PerfilFinanceiro => {
      const p: PerfilFinanceiro = { ...data, id: uid() };
      _perfis.push(p);
      return p;
    },
    update: (id: string, data: Partial<PerfilFinanceiro>): PerfilFinanceiro | null => {
      const idx = _perfis.findIndex((p) => p.id === id);
      if (idx < 0) return null;
      _perfis[idx] = { ..._perfis[idx], ...data };
      return _perfis[idx];
    },
  },

  templates: {
    list: () => [..._templates],
    get: (id: string) => _templates.find((t) => t.id === id),
    update: (id: string, data: Partial<TemplateMsg>) => {
      const idx = _templates.findIndex((t) => t.id === id);
      if (idx >= 0) _templates[idx] = { ..._templates[idx], ...data };
      return _templates[idx];
    },
    create: (data: Omit<TemplateMsg, "id" | "createdAt">) => {
      const t: TemplateMsg = { ...data, id: uid(), createdAt: new Date().toISOString() };
      _templates.push(t);
      return t;
    },
  },
  config: {
    getEmpresa: () => ({ ..._configEmpresa }),
    updateEmpresa: (data: Partial<ConfigEmpresa>) => {
      _configEmpresa = { ..._configEmpresa, ...data };
      return _configEmpresa;
    },
    getWhatsApp: () => ({ ..._configWhatsApp }),
    updateWhatsApp: (data: Partial<ConfigWhatsApp>) => {
      _configWhatsApp = { ..._configWhatsApp, ...data };
      return _configWhatsApp;
    },
  },
};
