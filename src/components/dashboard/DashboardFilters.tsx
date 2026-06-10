"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const periodos = [
  { value: "hoje",   label: "Hoje" },
  { value: "semana", label: "Sem." },
  { value: "mes",    label: "Mês" },
  { value: "ano",    label: "Ano" },
];

const statusOpts = [
  { value: "todos",        label: "Todos" },
  { value: "ativo",        label: "Ativos" },
  { value: "inadimplente", label: "Inad." },
  { value: "quitado",      label: "Quit." },
];

export function DashboardFilters() {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const periodo  = params.get("periodo") ?? "mes";
  const status   = params.get("status")  ?? "todos";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
      {/* Grupo de Filtros de Período */}
      <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 gap-1 flex-1 sm:flex-initial justify-between">
        {periodos.map((p) => (
          <button key={p.value} onClick={() => update("periodo", p.value)}
            className={`flex-1 sm:flex-none rounded-md px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-semibold transition-all cursor-pointer text-center ${
              periodo === p.value ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      
      {/* Grupo de Filtros de Status */}
      <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 gap-1 flex-1 sm:flex-initial justify-between">
        {statusOpts.map((s) => (
          <button key={s.value} onClick={() => update("status", s.value)}
            className={`flex-1 sm:flex-none rounded-md px-2.5 py-1.5 sm:px-2 sm:py-1 text-xs sm:text-[11px] font-semibold transition-all cursor-pointer text-center ${
              status === s.value ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
            }`}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
