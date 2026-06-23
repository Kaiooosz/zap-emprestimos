"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, User, MessageCircle, Eye, AlertTriangle, Search } from "lucide-react";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarMoeda } from "@/lib/utils";

interface ClienteListado {
  id: string;
  nome: string;
  phone: string;
  cpf: string | null;
  score: number;
  emprestimosAtivos: number;
  totalEmprestimos: number;
  temJurosDiario: boolean;
  taxaAtrasoDiario: number;
  parcelasAtrasadasCount: number;
  totalAtrasado: number;
  statusFinanceiro: "INADIMPLENTE" | "EM_DIA" | "SEM_CONTRATO";
  proximaParcelaId?: string;
  proximaParcelaValor: number;
  proximaParcelaVenc?: Date | null;
}

export function ClientesClient({ clientesInicial }: { clientesInicial: ClienteListado[] }) {
  const [busca, setBusca] = useState("");

  const clientesFiltrados = clientesInicial.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.phone.includes(busca) ||
    (c.cpf && c.cpf.includes(busca))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, telefone ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* ── Mobile: Cards ──────────────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {clientesFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <User size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nenhum cliente encontrado</p>
          </div>
        ) : (
          clientesFiltrados.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-sm truncate">{c.nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.phone}</p>
                </div>
                <ScoreBadge score={c.score} />
              </div>

              <div className="flex items-center gap-2 flex-wrap mb-3">
                {c.statusFinanceiro === "INADIMPLENTE" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                    <AlertTriangle size={10} />
                    Inadimplente · {formatarMoeda(c.totalAtrasado)}
                  </span>
                )}
                {c.statusFinanceiro === "EM_DIA" && (
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                    Em Dia
                  </span>
                )}
                {c.statusFinanceiro === "SEM_CONTRATO" && (
                  <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                    Sem Contrato
                  </span>
                )}
                {c.emprestimosAtivos > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {c.emprestimosAtivos} contrato{c.emprestimosAtivos !== 1 ? "s" : ""} ativo{c.emprestimosAtivos !== 1 ? "s" : ""}
                  </span>
                )}
                {c.temJurosDiario && (
                  <span className="text-[10px] text-blue-600 font-semibold">
                    +{c.taxaAtrasoDiario}%/dia
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/clientes/${c.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <Eye size={12} />
                  Ver Perfil
                </Link>
                {c.statusFinanceiro === "INADIMPLENTE" && c.phone && (
                  <a href={`https://api.whatsapp.com/send?phone=${c.phone.replace(/\D/g, "")}&text=${encodeURIComponent(`Ola, ${c.nome}. Identificamos que consta em aberto um valor total de ${c.totalAtrasado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em atraso. Favor regularizar o pagamento o quanto antes para evitar acrescimos de juros. Obrigado.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                    <MessageCircle size={12} />
                    Cobrar
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop: Tabela ─────────────────────────────────────────────────── */}
      <div className="hidden sm:block rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Nome / Contato", "Score", "Juros Diários", "Contratos", "Status", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">
                    <User size={28} className="mx-auto mb-2 text-slate-300" />
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900 text-sm">{c.nome}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.phone}</p>
                      {c.cpf && <p className="text-[10px] text-slate-400 mt-0.5">{c.cpf}</p>}
                    </td>
                    <td className="px-4 py-3.5"><ScoreBadge score={c.score} /></td>
                    <td className="px-4 py-3.5">
                      {c.temJurosDiario ? (
                        <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                          {c.taxaAtrasoDiario}%/dia
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-700">
                        {c.emprestimosAtivos}a / {c.totalEmprestimos}t
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {c.statusFinanceiro === "INADIMPLENTE" ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                          <AlertTriangle size={9} />
                          {formatarMoeda(c.totalAtrasado)}
                        </span>
                      ) : c.statusFinanceiro === "EM_DIA" ? (
                        <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                          Em Dia
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                          Sem Contrato
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/clientes/${c.id}`}
                          className="flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                          <Eye size={11} /> Ver
                        </Link>
                        {c.statusFinanceiro === "INADIMPLENTE" && c.phone && (
                          <a href={`https://api.whatsapp.com/send?phone=${c.phone.replace(/\D/g, "")}&text=${encodeURIComponent(`Ola, ${c.nome}. Identificamos que consta em aberto um valor total de ${c.totalAtrasado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em atraso. Favor regularizar o pagamento o quanto antes para evitar acrescimos de juros. Obrigado.`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                            <MessageCircle size={11} /> Cobrar
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
