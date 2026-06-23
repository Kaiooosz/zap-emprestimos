"use client";

import { Parcela } from "@/lib/store";
import { obterMeiaNoiteBR } from "@/lib/utils";

interface MiniCalendarioProps {
  parcelas: Parcela[];
}

export function MiniCalendario({ parcelas }: MiniCalendarioProps) {
  const hoje = obterMeiaNoiteBR();
  const ano  = hoje.getFullYear();
  const mes  = hoje.getMonth();

  const nomeMes = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay();

  // Mapeia status por dia
  const statusPorDia: Record<number, string> = {};
  parcelas.forEach((p) => {
    const d = obterMeiaNoiteBR(p.dataVencimento);
    if (d.getFullYear() === ano && d.getMonth() === mes) {
      const dia = d.getDate();
      if (!statusPorDia[dia] || p.status === "ATRASADO" || (statusPorDia[dia] === "PAGO" && p.status !== "PAGO")) {
        statusPorDia[dia] = p.status;
      }
    }
  });

  const dias = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Calendario</p>
        <p className="text-sm font-bold text-slate-900 capitalize">{nomeMes}</p>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {dias.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Dias do mês */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: diasNoMes }, (_, i) => {
          const dia = i + 1;
          const status = statusPorDia[dia];
          const isHoje = dia === hoje.getDate();

          let bg = "hover:bg-slate-50";
          let text = "text-slate-600";
          let dot = "";

          if (status === "ATRASADO") dot = "bg-red-400";
          else if (status === "PENDENTE") dot = "bg-blue-400";
          else if (status === "PAGO")    dot = "bg-emerald-400";

          if (isHoje) { bg = "bg-slate-900"; text = "text-white"; }

          return (
            <div key={dia}
              className={`relative flex h-7 w-full items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-default ${bg} ${text}`}>
              {dia}
              {dot && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${isHoje ? "bg-white" : dot}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
        {[
          { cor: "bg-red-400",      label: "Atrasado" },
          { cor: "bg-blue-400",     label: "Pendente" },
          { cor: "bg-emerald-400",  label: "Pago" },
        ].map(({ cor, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`h-1.5 w-1.5 rounded-full ${cor}`} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
