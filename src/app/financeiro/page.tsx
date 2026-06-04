import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { store } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { PagarContaBtn } from "@/components/financeiro/PagarContaBtn";

export const dynamic = "force-dynamic";

const categoriaLabel: Record<string, string> = {
  ALUGUEL: "Aluguel", SALARIO: "Salario", IMPOSTO: "Imposto",
  SERVICO: "Servico", MARKETING: "Marketing", TECNOLOGIA: "Tecnologia", OUTROS: "Outros",
};

export default function FinanceiroPage() {
  const contas = store.contas.list();
  const pendente = contas.filter((c) => c.status !== "PAGO").reduce((s, c) => s + c.valor, 0);
  const pago = contas.filter((c) => c.status === "PAGO").reduce((s, c) => s + c.valor, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-blue-700" />
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Contas a Pagar</h1>
            <p className="text-sm text-slate-400 mt-0.5">Financeiro interno da empresa</p>
          </div>
        </div>
        <Link href="/financeiro/nova" className="flex items-center gap-1.5 rounded-xl bg-blue-700 border border-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          <Plus size={16} strokeWidth={2.5} />
          Nova Conta
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-400">A Pagar</p>
          <p className="text-lg font-bold text-red-400 mt-0.5">{formatarMoeda(pendente)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-400">Pago no Mes</p>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">{formatarMoeda(pago)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-400">Total de Contas</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{contas.length}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {["Descricao", "Categoria", "Valor", "Vencimento", "Status", "Acao"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e3a5f]/50">
            {contas.map((c) => (
              <tr key={c.id} className="hover:bg-white/30 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900">{c.descricao}</p>
                  {c.recorrente && <p className="text-xs text-slate-500">Recorrente</p>}
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-slate-400 bg-[#1e3a5f] px-2 py-0.5 rounded-full">
                    {categoriaLabel[c.categoria]}
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold text-slate-900 tabular-nums">{formatarMoeda(c.valor)}</td>
                <td className="px-5 py-4 text-xs text-slate-400">{formatarData(c.dataVencimento)}</td>
                <td className="px-5 py-4"><StatusBadge status={c.status as any} /></td>
                <td className="px-5 py-4">
                  {c.status !== "PAGO" && <PagarContaBtn contaId={c.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
