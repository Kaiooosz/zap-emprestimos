"use client";

import { CheckCircle2, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { ParcelaHoje } from "@/types/dashboard";
import { formatarMoeda } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SolicitacoesRecentesProps {
  parcelas: ParcelaHoje[];
}

const statusConfig = {
  PAGO:     { label: "Aprovado",  color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle2 },
  PENDENTE: { label: "Em Analise",color: "text-slate-300 bg-slate-100",         icon: Clock },
  ATRASADO: { label: "Atrasado",  color: "text-red-400 bg-red-400/10",          icon: Clock },
  PARCIAL:  { label: "Parcial",   color: "text-amber-400 bg-amber-400/10",      icon: Clock },
};

export function SolicitacoesRecentes({ parcelas }: SolicitacoesRecentesProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h3 className="text-sm font-semibold text-white">Solicitacoes Recentes</h3>
        <Link
          href="/emprestimos/novo"
          className="flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-blue-800 transition-colors"
        >
          <Plus size={12} strokeWidth={2.5} />
          Novo Emprestimo
        </Link>
      </div>

      {parcelas.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-600 text-center py-8">Nenhuma cobranca para hoje</p>
        </div>
      ) : (
        <div className="divide-y divide-[#152035]/80">
          {parcelas.map((p) => {
            const cfg = statusConfig[p.status] ?? statusConfig.PENDENTE;
            const Icon = cfg.icon;
            return (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", cfg.color)}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.clienteNome}</p>
                  <p className={cn("text-xs font-medium", cfg.color.split(" ")[0])}>{cfg.label}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">{formatarMoeda(p.valorDevido)}</p>
                </div>
                <button className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-blue-600 hover:text-slate-200 transition-colors">
                  Cobrar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
