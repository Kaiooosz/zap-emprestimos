"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const periodos = [
  { value: "hoje",   label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes",    label: "Mês" },
  { value: "ano",    label: "Ano" },
];

const statusOpts = [
  { value: "todos",       label: "Todos" },
  { value: "ativo",       label: "Ativos" },
  { value: "inadimplente",label: "Inadimplentes" },
  { value: "quitado",     label: "Quitados" },
];

export function DashboardFilters() {
  const router    = useRouter();
  const pathname  = usePathname();
  const params    = useSearchParams();
  const periodo   = params.get("periodo") ?? "mes";
  const status    = params.get("status")  ?? "todos";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Período */}
      <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5">
        {periodos.map((p) => (
          <button
            key={p.value}
            onClick={() => update("periodo", p.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              periodo === p.value
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5">
        {statusOpts.map((s) => (
          <button
            key={s.value}
            onClick={() => update("status", s.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              status === s.value
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
