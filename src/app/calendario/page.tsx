import { store } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatarMoeda } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getDiasDoMes(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1).getDay();
  const total = new Date(ano, mes + 1, 0).getDate();
  return { primeiro, total };
}

export default function CalendarioPage({ searchParams }: { searchParams: Promise<{ mes?: string; ano?: string }> }) {
  const hoje = new Date();
  // Note: searchParams is async in Next.js 15+ but we use sync data here
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const { primeiro, total } = getDiasDoMes(anoAtual, mesAtual);

  store.parcelas.marcarAtrasadas();
  const todasParcelas = store.parcelas.list();

  // Mapeia parcelas por dia do mês atual
  const porDia: Record<number, typeof todasParcelas> = {};
  todasParcelas.forEach((p) => {
    const d = new Date(p.dataVencimento);
    if (d.getFullYear() === anoAtual && d.getMonth() === mesAtual) {
      const dia = d.getDate();
      if (!porDia[dia]) porDia[dia] = [];
      porDia[dia].push(p);
    }
  });

  const nomeMes = hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  // Próximos vencimentos (todos os meses)
  const proximos = todasParcelas
    .filter((p) => ["PENDENTE", "ATRASADO"].includes(p.status))
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    .slice(0, 10)
    .map((p) => {
      const e = store.emprestimos.get(p.emprestimoId);
      const c = e ? store.clientes.get(e.clienteId) : null;
      return { ...p, clienteNome: c?.nome ?? "—", clientePhone: c?.phone ?? "—", emprestimoId: p.emprestimoId };
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CalendarDays size={20} className="text-blue-700" />
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight capitalize">{nomeMes}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vencimentos e cobranças</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Calendário */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dias.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiro }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: total }, (_, i) => {
              const dia = i + 1;
              const parcelas = porDia[dia] ?? [];
              const isHoje = dia === hoje.getDate();
              const temAtrasado = parcelas.some((p) => p.status === "ATRASADO");
              const temPendente = parcelas.some((p) => p.status === "PENDENTE");
              const temPago = parcelas.some((p) => p.status === "PAGO");

              return (
                <div
                  key={dia}
                  className={`min-h-[56px] rounded-xl p-2 border transition-colors ${isHoje ? "border-[#4a78c0] bg-[#4a78c0]/10" : "border-slate-200/50 hover:border-slate-200"}`}
                >
                  <p className={`text-xs font-bold mb-1 ${isHoje ? "text-blue-700" : "text-slate-400"}`}>{dia}</p>
                  {temAtrasado && <div className="h-1.5 w-1.5 rounded-full bg-red-500 mb-0.5" />}
                  {temPendente && <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mb-0.5" />}
                  {temPago && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  {parcelas.length > 0 && (
                    <p className="text-xs text-slate-500 leading-none">{parcelas.length}p</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
            {[["Atrasado", "bg-red-500"], ["Pendente", "bg-amber-500"], ["Pago", "bg-emerald-500"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className={`h-2 w-2 rounded-full ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Próximos vencimentos */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Proximos Vencimentos</h2>
          </div>
          <div className="divide-y divide-[#1e3a5f]/50">
            {proximos.map((p) => (
              <Link key={p.id} href={`/emprestimos/${p.emprestimoId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-blue-700 transition-colors">{p.clienteNome}</p>
                  <p className="text-xs text-slate-400">{new Date(p.dataVencimento).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">{formatarMoeda(p.valorDevido)}</p>
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            ))}
            {proximos.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">Sem vencimentos pendentes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
