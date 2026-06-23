"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit2, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ModalEditarContrato } from "@/components/emprestimos/ModalEditarContrato";
import { formatarMoeda, formatarData } from "@/lib/utils";

interface ParcelaData {
  id: string;
  numero: number;
  valorDevido: number;
  dataVencimento: string;
  status: string;
}

interface Emprestimo {
  id: string;
  status: string;
  dataInicio: string;
  dataVencimento: string;
  taxaJuros: number;
  taxaAtraso: number;
  valorPrincipal: number;
  valorTotal: number;
  totalJuros: number;
  numParcelas: number;
  observacoes?: string | null;
  parcelas: ParcelaData[];
}

interface ContratosListClientProps {
  emprestimos: Emprestimo[];
}

export function ContratosListClient({ emprestimos }: ContratosListClientProps) {
  const [editingContrato, setEditingContrato] = useState<Emprestimo | null>(null);

  return (
    <>
      <div className="divide-y divide-slate-50">
        {emprestimos.map((e) => {
          const pagas = e.parcelas.filter((p) => p.status === "PAGO").length;
          const valorPago = e.parcelas.filter((p) => p.status === "PAGO").reduce((s, p) => s + Number(p.valorDevido), 0);
          const saldoContrato = e.parcelas.filter((p) => ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status)).reduce((s, p) => s + Number(p.valorDevido), 0);
          const pct = e.numParcelas > 0 ? (pagas / e.numParcelas) * 100 : 0;

          return (
            <div key={e.id} className="group relative hover:bg-slate-50/50 transition-colors">
              
              {/* Botão de Edição dedicado na lateral */}
              <button
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  setEditingContrato(e);
                }}
                title="Editar Contrato"
                className="absolute right-4 top-4 z-10 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-blue-600 hover:border-blue-200 shadow-xs transition-all cursor-pointer"
              >
                <Edit2 size={13} />
              </button>

              <Link href={`/emprestimos/${e.id}`} className="block flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 pr-8">
                    <StatusBadge status={e.status as any}/>
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{formatarData(e.dataInicio)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-slate-900">{formatarMoeda(e.valorTotal)}</span>
                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">{e.taxaJuros}% · {e.numParcelas}x</span>
                  </div>
                  <div className="grid grid-cols-2 xs:flex xs:items-center gap-4 mt-2">
                    <div>
                      <p className="text-[10px] text-slate-400">Capital Emprestado</p>
                      <p className="text-xs font-semibold text-slate-700">{formatarMoeda(e.valorPrincipal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Total de Juros</p>
                      <p className="text-xs font-semibold text-slate-700">{formatarMoeda(e.totalJuros)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Já Recebido</p>
                      <p className="text-xs font-semibold text-emerald-600">{formatarMoeda(valorPago)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Saldo Devedor</p>
                      <p className="text-xs font-semibold text-red-600">{formatarMoeda(saldoContrato)}</p>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 w-full sm:w-24 pt-3 sm:pt-0 border-t border-slate-50 sm:border-t-0 flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-2">
                  <div className="w-full sm:w-auto">
                    <p className="text-xs text-slate-500 mb-1">{pagas}/{e.numParcelas} pagas</p>
                    <div className="h-1.5 w-full sm:w-24 rounded-full bg-slate-100 overflow-hidden mb-1">
                      <div className="h-full rounded-full bg-slate-800 transition-all" style={{ width: `${pct}%` }}/>
                    </div>
                  </div>
                  {e.status === "QUITADO" && (
                    <p className="text-[10px] font-bold text-emerald-500 flex items-center justify-end gap-1 shrink-0 mt-2">
                      <CheckCircle size={10} /> Quitado
                    </p>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {editingContrato && (
        <ModalEditarContrato
          emprestimo={editingContrato as any}
          onClose={() => setEditingContrato(null)}
        />
      )}
    </>
  );
}
