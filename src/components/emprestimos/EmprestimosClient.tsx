"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarMoeda, formatarData } from "@/lib/utils";

const tipoLabel: Record<string, string> = { DIARIO: "Diário", SEMANAL: "Semanal", QUINZENAL: "Quinzenal", MENSAL: "Mensal" };

interface EmprestimoListado {
  id: string;
  valorPrincipal: number;
  valorTotal: number;
  taxaJuros: number;
  tipo: string;
  status: "ATIVO" | "INADIMPLENTE" | "QUITADO" | "CANCELADO";
  createdAt: Date;
  numParcelas: number;
  parcelasPagas: number;
  cliente: {
    id: string;
    nome: string;
    score: number;
  } | null;
}

export function EmprestimosClient({ emprestimosInicial }: { emprestimosInicial: EmprestimoListado[] }) {
  const [busca, setBusca] = useState("");

  const emprestimosFiltrados = emprestimosInicial.filter((e) =>
    e.cliente?.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar por nome do cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {emprestimosFiltrados.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum emprestimo encontrado</p>
        ) : (
          emprestimosFiltrados.map((e) => (
            <Link key={e.id} href={`/emprestimos/${e.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{e.cliente?.nome ?? "—"}</p>
                  <StatusBadge status={e.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {e.cliente && <ScoreBadge score={e.cliente.score} />}
                  <span>{tipoLabel[e.tipo] ?? e.tipo}</span>
                  <span>·</span>
                  <span>{e.taxaJuros}%</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{formatarMoeda(e.valorTotal)}</p>
                    <p className="text-[10px] text-slate-400">Principal: {formatarMoeda(e.valorPrincipal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{e.parcelasPagas}/{e.numParcelas} pagas</p>
                    <div className="h-1 w-20 rounded-full bg-slate-100 mt-1">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${(e.parcelasPagas / e.numParcelas) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {["Cliente", "Valor", "Taxa", "Parcelas", "Tipo", "Inicio", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emprestimosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">Nenhum emprestimo encontrado</td>
                </tr>
              ) : (
                emprestimosFiltrados.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{e.cliente?.nome ?? "—"}</p>
                      {e.cliente && (
                        <div className="mt-1"><ScoreBadge score={e.cliente.score} /></div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{formatarMoeda(e.valorTotal)}</p>
                      <p className="text-xs text-slate-400">Prin: {formatarMoeda(e.valorPrincipal)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{e.taxaJuros}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(e.parcelasPagas / e.numParcelas) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{e.parcelasPagas}/{e.numParcelas}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tipoLabel[e.tipo] ?? e.tipo}</td>
                    <td className="px-4 py-3 text-slate-500">{formatarData(e.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/emprestimos/${e.id}`} className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <ChevronRight size={18} />
                      </Link>
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
