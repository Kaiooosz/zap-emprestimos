import { cn } from "@/lib/utils";

type Status = "ATIVO" | "QUITADO" | "INADIMPLENTE" | "CANCELADO" | "PENDENTE" | "PAGO" | "ATRASADO" | "PARCIAL" | "ATIVA" | "SUSPENSA" | "DIA_DE_PAGAR";

// Paleta neutra: sem cores saturadas, apenas texto+borda discretos
const config: Record<Status, { label: string; className: string }> = {
  ATIVO:        { label: "Ativo",       className: "bg-blue-50 text-blue-700 border-blue-200" },
  ATIVA:        { label: "Ativa",       className: "bg-blue-50 text-blue-700 border-blue-200" },
  QUITADO:      { label: "Quitado",     className: "bg-slate-50 text-slate-600 border-slate-200" },
  INADIMPLENTE: { label: "Inadimplente",className: "bg-red-50 text-red-700 border-red-200" },
  CANCELADO:    { label: "Cancelado",   className: "bg-slate-50 text-slate-500 border-slate-200" },
  PENDENTE:     { label: "Pendente",    className: "bg-slate-50 text-slate-600 border-slate-200" },
  PAGO:         { label: "Pago",        className: "bg-slate-50 text-slate-600 border-slate-200" },
  ATRASADO:     { label: "Atrasado",    className: "bg-red-50 text-red-700 border-red-200" },
  PARCIAL:      { label: "Parcial",     className: "bg-amber-50 text-amber-700 border-amber-200" },
  SUSPENSA:     { label: "Suspensa",    className: "bg-slate-50 text-slate-500 border-slate-200" },
  DIA_DE_PAGAR: { label: "Dia de Pagar",className: "bg-blue-50 text-blue-700 border-blue-200" },
};

export function StatusBadge({ status }: { status: Status }) {
  const c = config[status] ?? { label: status, className: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", c.className)}>
      {c.label}
    </span>
  );
}
