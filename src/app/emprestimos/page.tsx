import Link from "next/link";
import { Plus, Search } from "lucide-react";
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Emprestimos</h1>
          <p className="text-sm text-slate-400 mt-0.5">{ativos} contratos ativos · {formatarMoeda(capitalNaRua)} na rua</p>
        </div>
        <Link href="/emprestimos/novo" className="flex items-center gap-1.5 rounded-xl bg-blue-700 border border-blue-600 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-blue-800 transition-colors">
          <Plus size={16} strokeWidth={2.5} />
          Novo Emprestimo
        </Link>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {["Cliente", "Valor", "Taxa", "Parcelas", "Tipo", "Inicio", "Status", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e3a5f]/50">
            {emprestimos.map((e) => (
              <tr key={e.id} className="hover:bg-white/40 transition-colors group">
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
                <td className="px-5 py-4 text-slate-300 font-mono">{e.taxaJuros}%</td>
                <td className="px-5 py-4">
                  <p className="text-slate-900">{e.parcelasPagas}/{e.numParcelas}</p>
                  <div className="h-1 w-16 rounded-full bg-slate-700 mt-1">
                    <div className="h-full rounded-full bg-[#4a78c0]" style={{ width: `${(e.parcelasPagas / e.numParcelas) * 100}%` }} />
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-300">{tipoLabel[e.tipo]}</td>
                <td className="px-5 py-4 text-slate-400 text-xs">{formatarData(e.dataInicio)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={e.status} />
                </td>
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
