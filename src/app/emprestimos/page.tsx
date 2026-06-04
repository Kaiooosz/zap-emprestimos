import Link from "next/link";
import { Plus } from "lucide-react";
import { store } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarMoeda, formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tipoLabel: Record<string, string> = { DIARIO: "Diário", SEMANAL: "Semanal", QUINZENAL: "Quinzenal", MENSAL: "Mensal" };

export default function EmprestimosPage() {
  const emprestimos = store.emprestimos.list().map((e) => ({
    ...e,
    cliente: store.clientes.get(e.clienteId),
    parcelasPagas: store.parcelas.list(e.id).filter((p) => p.status === "PAGO").length,
  }));

  const ativos = emprestimos.filter((e) => e.status === "ATIVO").length;
  const capitalNaRua = emprestimos
    .filter((e) => e.status === "ATIVO")
    .flatMap((e) => store.parcelas.list(e.id).filter((p) => ["PENDENTE", "ATRASADO"].includes(p.status)))
    .reduce((s, p) => s + p.valorDevido, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Emprestimos</h1>
          <p className="text-xs text-slate-400 mt-0.5">{ativos} ativos · {formatarMoeda(capitalNaRua)} na rua</p>
        </div>
        {/* Só aparece no desktop — mobile usa o + da topbar */}
        <Link href="/emprestimos/novo" className="hidden md:flex items-center gap-1.5 rounded-xl bg-blue-700 border border-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          <Plus size={15} strokeWidth={2.5} />
          Novo Emprestimo
        </Link>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {emprestimos.map((e) => (
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
        ))}
        {emprestimos.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum emprestimo cadastrado</p>
        )}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {["Cliente", "Valor", "Taxa", "Parcelas", "Tipo", "Inicio", "Status", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {emprestimos.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{e.cliente?.nome ?? "—"}</p>
                    {e.cliente && <ScoreBadge score={e.cliente.score} />}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">{formatarMoeda(e.valorTotal)}</p>
                  <p className="text-xs text-slate-400">Principal: {formatarMoeda(e.valorPrincipal)}</p>
                </td>
                <td className="px-5 py-4 text-slate-700 font-mono">{e.taxaJuros}%</td>
                <td className="px-5 py-4">
                  <p className="text-slate-900">{e.parcelasPagas}/{e.numParcelas}</p>
                  <div className="h-1 w-16 rounded-full bg-slate-100 mt-1">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${(e.parcelasPagas / e.numParcelas) * 100}%` }} />
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{tipoLabel[e.tipo]}</td>
                <td className="px-5 py-4 text-slate-400 text-xs">{formatarData(e.dataInicio)}</td>
                <td className="px-5 py-4"><StatusBadge status={e.status} /></td>
                <td className="px-5 py-4">
                  <Link href={`/emprestimos/${e.id}`} className="text-xs text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity font-medium hover:underline">
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {emprestimos.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-sm">Nenhum emprestimo cadastrado</div>
        )}
      </div>
    </div>
  );
}
