import Link from "next/link";
import { Plus, User } from "lucide-react";
import { store } from "@/lib/store";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function ClientesPage() {
  const clientes = store.clientes.list().map((c) => ({
    ...c,
    emprestimosAtivos: store.emprestimos.list(c.id).filter((e) => e.status === "ATIVO").length,
    totalEmprestimos: store.emprestimos.list(c.id).length,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-xs text-slate-400 mt-0.5">{clientes.length} cadastrados</p>
        </div>
        <Link href="/clientes/novo" className="hidden md:flex items-center gap-1.5 rounded-xl bg-blue-700 border border-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          <Plus size={15} strokeWidth={2.5} />
          Novo Cliente
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {clientes.map((c) => (
          <Link key={c.id} href={`/clientes/${c.id}`} className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-[#4a78c0]/40 transition-all">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-[#1e3a5f] flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-slate-200">{c.nome[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{c.nome}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.phone}</p>
                {c.cpf && <p className="text-xs text-slate-500 mt-0.5">{c.cpf}</p>}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
              <ScoreBadge score={c.score} />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{c.emprestimosAtivos} ativo{c.emprestimosAtivos !== 1 ? "s" : ""} / {c.totalEmprestimos} total</span>
                <span>{c.cidade ?? "—"}</span>
              </div>
              <p className="text-xs text-slate-500">Desde {formatarData(c.createdAt)}</p>
            </div>
          </Link>
        ))}
      </div>

      {clientes.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
          <User size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhum cliente cadastrado</p>
          <Link href="/clientes/novo" className="inline-block mt-3 text-xs text-slate-400 hover:text-slate-200 hover:underline">Cadastrar primeiro cliente</Link>
        </div>
      )}
    </div>
  );
}
