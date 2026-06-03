import { cn } from "@/lib/utils";

type Status = "ATIVO" | "QUITADO" | "INADIMPLENTE" | "CANCELADO" | "PENDENTE" | "PAGO" | "ATRASADO" | "PARCIAL" | "ATIVA" | "SUSPENSA";

const config: Record<Status, { label: string; className: string }> = {
  ATIVO:       { label: "Ativo",       className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  ATIVA:       { label: "Ativa",       className: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  QUITADO:     { label: "Quitado",     className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  INADIMPLENTE:{ label: "Inadimplente",className: "bg-red-500/15 text-red-400 border-red-500/20" },
  CANCELADO:   { label: "Cancelado",   className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  PENDENTE:    { label: "Pendente",    className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  PAGO:        { label: "Pago",        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  ATRASADO:    { label: "Atrasado",    className: "bg-red-500/15 text-red-400 border-red-500/20" },
  PARCIAL:     { label: "Parcial",     className: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  SUSPENSA:    { label: "Suspensa",    className: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
};

export function StatusBadge({ status }: { status: Status }) {
  const c = config[status] ?? { label: status, className: "bg-slate-500/15 text-slate-400" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", c.className)}>
      {c.label}
    </span>
  );
}
