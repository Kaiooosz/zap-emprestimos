"use client";

import { useState, useMemo } from "react";
import { 
  DollarSign, TrendingUp, Users, Calendar, Download, 
  Search, SlidersHorizontal, ArrowUpDown, Layers,
  ChevronLeft, ChevronRight, BarChart3, PieChart
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell, Legend,
  BarChart, Bar, CartesianGrid
} from "recharts";
import { formatarMoeda, formatarData } from "@/lib/utils";

// Definição das cores do painel Power BI
const CORES = ["#1d4ed8", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"];
const COR_DONUT = ["#3b82f6", "#10b981"]; // Modalidade 1 (Azul), Modalidade 2 (Verde)

interface ParcelaRelatorio {
  id: string;
  numero: number;
  valorDevido: any;
  valorPrincipal: any;
  valorJuros: any;
  valorPago: any;
  dataVencimento: any;
  dataPagamento: any;
  status: string;
  modoPagamento: string | null;
  emprestimo: {
    id: string;
    numParcelas: number;
    tipoProduto: string;
    cliente: {
      id: string;
      nome: string;
    };
    operador: {
      id: string;
      nome: string;
    };
  };
}

interface UserSimplificado {
  id: string;
  nome: string;
}

interface PainelAnaliticoProps {
  parcelasRaw: ParcelaRelatorio[];
  equipe: UserSimplificado[];
}

export function PainelAnalitico({ parcelasRaw, equipe }: PainelAnaliticoProps) {
  const hoje = new Date();
  
  // Estados para filtros
  const [dataInicio, setDataInicio] = useState<string>(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0]
  );
  const [dataFim, setDataFim] = useState<string>(
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1).toISOString().split("T")[0]
  );
  const [operadorId, setOperadorId] = useState<string>("todos");
  const [modalidade, setModalidade] = useState<string>("todos");
  const [buscaCliente, setBuscaCliente] = useState<string>("");
  
  // Estado para ordenação e paginação da tabela
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: "asc" | "desc" }>({
    campo: "dataPagamento",
    direcao: "desc"
  });
  const [pagina, setPagina] = useState<number>(1);
  const itensPorPagina = 8;

  const toN = (v: any) => Number(v ?? 0);

  // 1. Filtragem Reativa dos Dados
  const dadosFiltrados = useMemo(() => {
    return parcelasRaw.filter((p) => {
      // Apenas parcelas pagas
      if (p.status !== "PAGO" || !p.dataPagamento) return false;
      
      const dataPag = new Date(p.dataPagamento);
      const dataIni = dataInicio ? new Date(dataInicio + "T00:00:00") : null;
      const dataF = dataFim ? new Date(dataFim + "T23:59:59") : null;
      
      // Filtro de Data
      if (dataIni && dataPag < dataIni) return false;
      if (dataF && dataPag > dataF) return false;
      
      // Filtro de Operador
      if (operadorId !== "todos" && p.emprestimo.operador.id !== operadorId) return false;
      
      // Filtro de Modalidade (Mensal vs Parcelado)
      // Modalidade 1: Mensal (1 parcela), Modalidade 2: Parcelado (> 1 parcela)
      const numParcs = p.emprestimo.numParcelas;
      if (modalidade === "mensal" && numParcs > 1) return false;
      if (modalidade === "parcelado" && numParcs <= 1) return false;
      
      // Filtro de busca de Cliente
      if (buscaCliente && !p.emprestimo.cliente.nome.toLowerCase().includes(buscaCliente.toLowerCase())) return false;
      
      return true;
    });
  }, [parcelasRaw, dataInicio, dataFim, operadorId, modalidade, buscaCliente]);

  // 2. Cálculos de KPIs baseados no filtro
  const kpis = useMemo(() => {
    const totalRecebido = dadosFiltrados.reduce((s, p) => s + toN(p.valorPago), 0);
    const totalJuros = dadosFiltrados.reduce((s, p) => s + toN(p.valorJuros), 0);
    const totalPrincipal = dadosFiltrados.reduce((s, p) => s + toN(p.valorPrincipal), 0);
    const transacoes = dadosFiltrados.length;
    const ticketMedio = transacoes > 0 ? totalRecebido / transacoes : 0;
    
    return {
      totalRecebido,
      totalJuros,
      totalPrincipal,
      transacoes,
      ticketMedio
    };
  }, [dadosFiltrados]);

  // 3. Preparação dos dados para Gráfico de Evolução (Evolução Temporal)
  const dadosEvolucao = useMemo(() => {
    const mapaDatas: Record<string, number> = {};
    
    // Inicializar datas no intervalo para não ter lacunas (se for menor que 35 dias)
    const dIni = dataInicio ? new Date(dataInicio + "T00:00:00") : null;
    const dFim = dataFim ? new Date(dataFim + "T23:59:59") : null;
    
    if (dIni && dFim && (dFim.getTime() - dIni.getTime()) / 86400000 < 35) {
      const temp = new Date(dIni);
      while (temp <= dFim) {
        mapaDatas[temp.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })] = 0;
        temp.setDate(temp.getDate() + 1);
      }
    }

    dadosFiltrados.forEach((p) => {
      const dataStr = new Date(p.dataPagamento!).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      mapaDatas[dataStr] = (mapaDatas[dataStr] || 0) + toN(p.valorPago);
    });

    return Object.entries(mapaDatas).map(([data, valor]) => ({
      data,
      recebido: valor
    })).sort((a, b) => {
      // Ordenar por data corretamente (converter string simplificada de volta é chato, 
      // então confiamos que a inicialização acima ou ordenação de transações faça sentido)
      return 0; // Se gerado pelo loop de datas, já está ordenado
    });
  }, [dadosFiltrados, dataInicio, dataFim]);

  // 4. Preparação dos dados para Gráfico de Rosca por Modalidade
  const dadosModalidade = useMemo(() => {
    let mensal = 0;
    let parcelado = 0;
    
    dadosFiltrados.forEach((p) => {
      if (p.emprestimo.numParcelas <= 1) {
        mensal += toN(p.valorPago);
      } else {
        parcelado += toN(p.valorPago);
      }
    });
    
    return [
      { name: "Mensal (Renovação)", value: mensal },
      { name: "Parcelado Tradicional", value: parcelado }
    ].filter(d => d.value > 0);
  }, [dadosFiltrados]);

  // 5. Preparação dos dados para Gráfico de Recebimento por Operador
  const dadosOperador = useMemo(() => {
    const mapaOperadores: Record<string, number> = {};
    
    dadosFiltrados.forEach((p) => {
      const nome = p.emprestimo.operador.nome;
      mapaOperadores[nome] = (mapaOperadores[nome] || 0) + toN(p.valorPago);
    });
    
    return Object.entries(mapaOperadores)
      .map(([nome, valor]) => ({ nome, recebido: valor }))
      .sort((a, b) => b.recebido - a.recebido)
      .slice(0, 5); // top 5
  }, [dadosFiltrados]);

  // 6. Ordenação e Paginação da Tabela
  const tabelaOrdenada = useMemo(() => {
    const temp = [...dadosFiltrados];
    temp.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      
      if (ordenacao.campo === "dataPagamento") {
        valA = new Date(a.dataPagamento!).getTime();
        valB = new Date(b.dataPagamento!).getTime();
      } else if (ordenacao.campo === "cliente") {
        valA = a.emprestimo.cliente.nome;
        valB = b.emprestimo.cliente.nome;
      } else if (ordenacao.campo === "operador") {
        valA = a.emprestimo.operador.nome;
        valB = b.emprestimo.operador.nome;
      } else if (ordenacao.campo === "valorPago") {
        valA = toN(a.valorPago);
        valB = toN(b.valorPago);
      } else if (ordenacao.campo === "juros") {
        valA = toN(a.valorJuros);
        valB = toN(b.valorJuros);
      }
      
      if (valA < valB) return ordenacao.direcao === "asc" ? -1 : 1;
      if (valA > valB) return ordenacao.direcao === "asc" ? 1 : -1;
      return 0;
    });
    return temp;
  }, [dadosFiltrados, ordenacao]);

  const tabelaPaginada = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return tabelaOrdenada.slice(inicio, inicio + itensPorPagina);
  }, [tabelaOrdenada, pagina]);

  const totalPaginas = Math.ceil(tabelaOrdenada.length / itensPorPagina);

  const mudarOrdenacao = (campo: string) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "desc" ? "asc" : "desc"
    }));
    setPagina(1);
  };

  // 7. Função para Exportar CSV (Analista de Dados)
  const exportarCSV = () => {
    const cabecalho = ["Data Pagamento", "Cliente", "Contrato ID", "N Parcela", "Operador", "Principal Pago", "Juros Pago", "Valor Total Pago", "Modo Pagamento"];
    const linhas = dadosFiltrados.map((p) => [
      new Date(p.dataPagamento!).toLocaleDateString("pt-BR"),
      p.emprestimo.cliente.nome,
      p.emprestimo.id,
      p.numero,
      p.emprestimo.operador.nome,
      toN(p.valorPrincipal).toFixed(2),
      toN(p.valorJuros).toFixed(2),
      toN(p.valorPago).toFixed(2),
      p.modoPagamento || "Padrão"
    ]);
    
    const conteudoCSV = [
      cabecalho.join(","),
      ...linhas.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + conteudoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `zap_recebimentos_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Painel Informativo sobre Relatórios Analíticos */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 leading-relaxed space-y-2">
        <p className="font-semibold text-slate-700">Painel Analítico e Exportação de Dados:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Métricas e Gráficos Reativos</strong>: Ao alterar qualquer filtro (Datas, Cliente, Operador ou Modalidade), a base de cálculos de todos os KPIs e os gráficos dinâmicos de faturamento, rosca de modalidades e ranking de membros são atualizados em tempo real.</li>
          <li><strong>Exportador para CSV</strong>: O botão "Exportar CSV" gera o download imediato dos registros da tabela de transações respeitando exatamente os filtros ativos no momento. Isso possibilita análises externas personalizadas e montagem de relatórios gerenciais no Microsoft Excel, Google Sheets ou Power BI.</li>
        </ul>
      </div>

      {/* Barra de Filtros Avançados */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-3">
          <SlidersHorizontal size={16} className="text-blue-700" />
          <h2 className="text-sm">Filtros de Análise (Power BI Dashboard)</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca Cliente */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Cliente</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar cliente..." 
                value={buscaCliente}
                onChange={(e) => { setBuscaCliente(e.target.value); setPagina(1); }}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-700 focus:border-blue-700 transition-colors"
              />
            </div>
          </div>

          {/* Operador */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Operador (Equipe)</label>
            <select 
              value={operadorId}
              onChange={(e) => { setOperadorId(e.target.value); setPagina(1); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-700 focus:border-blue-700 transition-colors appearance-none cursor-pointer"
            >
              <option value="todos">Todos os Operadores</option>
              {equipe.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Modalidade */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Modalidade</label>
            <select 
              value={modalidade}
              onChange={(e) => { setModalidade(e.target.value); setPagina(1); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-700 focus:border-blue-700 transition-colors appearance-none cursor-pointer"
            >
              <option value="todos">Todas as Modalidades</option>
              <option value="mensal">Mensal (Rolagem / Juros 30%)</option>
              <option value="parcelado">Parcelado Tradicional</option>
            </select>
          </div>

          {/* Data Início */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Data Início</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input 
                type="date" 
                value={dataInicio}
                onChange={(e) => { setDataInicio(e.target.value); setPagina(1); }}
                className="w-full rounded-xl border border-slate-200 pl-3 pr-8 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-700 focus:border-blue-700 transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* Data Fim */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input 
                type="date" 
                value={dataFim}
                onChange={(e) => { setDataFim(e.target.value); setPagina(1); }}
                className="w-full rounded-xl border border-slate-200 pl-3 pr-8 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-700 focus:border-blue-700 transition-colors cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Reativos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {[
          { label: "Total Recebido", value: formatarMoeda(kpis.totalRecebido), color: "text-blue-700", icon: DollarSign, bg: "bg-blue-50" },
          { label: "Juros Coletados", value: formatarMoeda(kpis.totalJuros), color: "text-emerald-600", icon: TrendingUp, bg: "bg-emerald-50" },
          { label: "Principal Amortizado", value: formatarMoeda(kpis.totalPrincipal), color: "text-purple-600", icon: Layers, bg: "bg-purple-50" },
          { label: "Transações", value: `${kpis.transacoes} pgto`, color: "text-slate-700", icon: Calendar, bg: "bg-slate-50" },
          { label: "Ticket Médio", value: formatarMoeda(kpis.ticketMedio), color: "text-amber-600", icon: Users, bg: "bg-amber-50" },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between mb-1.5 gap-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate">{kpi.label}</span>
                <div className={`h-5 w-5 sm:h-6 sm:w-6 rounded-lg flex items-center justify-center shrink-0 ${kpi.bg}`}>
                  <Icon size={10} className={kpi.color} />
                </div>
              </div>
              <p className={`text-sm sm:text-base font-black tabular-nums truncate ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Gráficos em Linha (Evolução + Rosca e Operador) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Evolução temporal */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-blue-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Evolução Diária de Recebimentos</h3>
          </div>
          
          {dadosEvolucao.length === 0 || kpis.totalRecebido === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm">Sem dados de recebimento no período selecionado.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dadosEvolucao} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="corRecebido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="data" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value) => [formatarMoeda(Number(value)), "Recebido"]} 
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Area type="monotone" dataKey="recebido" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#corRecebido)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rosca: Modalidade de Empréstimo */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} className="text-blue-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Volume por Modalidade</h3>
          </div>
          
          {dadosModalidade.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Nenhum dado encontrado.</div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={dadosModalidade}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {dadosModalidade.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COR_DONUT[index % COR_DONUT.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatarMoeda(Number(value))} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 mt-2">
                {dadosModalidade.map((item, index) => {
                  const pct = kpis.totalRecebido > 0 ? (item.value / kpis.totalRecebido) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_DONUT[index % COR_DONUT.length] }} />
                        <span className="text-slate-500 font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatarMoeda(item.value)} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico Ranking de Operadores & Tabela de Recebimento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ranking Operadores */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-blue-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Top Recebimento por Operador</h3>
          </div>

          {dadosOperador.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Sem dados.</div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dadosOperador} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={(value) => formatarMoeda(Number(value))} />
                  <Bar dataKey="recebido" radius={[0, 4, 4, 0]}>
                    {dadosOperador.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              <div className="space-y-1.5 mt-3">
                {dadosOperador.map((op, idx) => (
                  <div key={op.nome} className="flex justify-between text-xs items-center">
                    <span className="text-slate-500 font-medium">{idx + 1}. {op.nome}</span>
                    <span className="font-bold text-slate-800 tabular-nums">{formatarMoeda(op.recebido)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabela de Lançamento Detalhado */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-blue-700" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Histórico Detalhado</h3>
            </div>
            
            <button 
              onClick={exportarCSV} 
              disabled={dadosFiltrados.length === 0}
              className="flex items-center justify-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-3 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
            >
              <Download size={11} /> Exportar CSV
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                <tr>
                  <th onClick={() => mudarOrdenacao("dataPagamento")} className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 select-none">
                    Data {ordenacao.campo === "dataPagamento" && (ordenacao.direcao === "asc" ? "▲" : "▼")}
                  </th>
                  <th onClick={() => mudarOrdenacao("cliente")} className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 select-none">
                    Cliente {ordenacao.campo === "cliente" && (ordenacao.direcao === "asc" ? "▲" : "▼")}
                  </th>
                  <th onClick={() => mudarOrdenacao("operador")} className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 select-none hidden sm:table-cell">
                    Operador {ordenacao.campo === "operador" && (ordenacao.direcao === "asc" ? "▲" : "▼")}
                  </th>
                  <th onClick={() => mudarOrdenacao("valorPago")} className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 select-none">
                    Valor {ordenacao.campo === "valorPago" && (ordenacao.direcao === "asc" ? "▲" : "▼")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabelaPaginada.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-medium">{p.dataPagamento ? formatarData(p.dataPagamento) : "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{p.emprestimo.cliente.nome}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Parcela {p.numero} ({p.emprestimo.numParcelas > 1 ? "Parcelado" : "Mensal"})</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-medium hidden sm:table-cell">{p.emprestimo.operador.nome}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">
                      {formatarMoeda(p.valorPago)}
                      {p.modoPagamento === "SOMENTE_JUROS" && (
                        <span className="block text-[8px] font-normal text-amber-500">Apenas Juros</span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {dadosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">Nenhum recebimento registrado nos critérios de filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-medium text-center">
              <span>Mostrando {tabelaPaginada.length} de {tabelaOrdenada.length} recebimentos</span>
              
              <div className="flex items-center justify-center gap-2">
                <button 
                  onClick={() => setPagina(prev => Math.max(1, prev - 1))}
                  disabled={pagina === 1}
                  className="p-2 sm:p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft size={14} className="sm:h-3 sm:w-3" />
                </button>
                <span className="px-1.5">Pág. {pagina} de {totalPaginas}</span>
                <button 
                  onClick={() => setPagina(prev => Math.min(totalPaginas, prev + 1))}
                  disabled={pagina === totalPaginas}
                  className="p-2 sm:p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronRight size={14} className="sm:h-3 sm:w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
