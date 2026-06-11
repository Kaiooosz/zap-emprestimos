"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";

const CATEGORIAS = [
  { id: "ALUGUEL", label: "Aluguel" },
  { id: "SALARIO", label: "Salário" },
  { id: "IMPOSTO", label: "Imposto" },
  { id: "SERVICO", label: "Serviço" },
  { id: "MARKETING", label: "Marketing" },
  { id: "TECNOLOGIA", label: "Tecnologia" },
  { id: "OUTROS", label: "Outros" },
];

export default function NovaContaPagarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("OUTROS");
  const [valor, setValor] = useState<number | "">("");
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().split("T")[0]);
  const [recorrente, setRecorrente] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao) return alert("Preencha a descrição");
    if (!valor || valor <= 0) return alert("Preencha o valor corretamente");

    setLoading(true);
    try {
      const res = await fetch("/api/financeiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao,
          categoria,
          valor,
          dataVencimento,
          recorrente,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar despesa");
      router.push("/financeiro");
      router.refresh();
    } catch {
      alert("Erro ao salvar conta a pagar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/financeiro" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Nova Conta a Pagar</h1>
          <p className="text-xs text-slate-500 mt-0.5">Cadastre uma despesa administrativa ou operacional</p>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-100">
          <Wallet size={16} className="text-slate-400" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dados da Despesa</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Descrição</label>
          <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} required
            placeholder="Ex: Aluguel Escritório, Servidor AWS, Salário João..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500 transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors">
              {CATEGORIAS.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Valor (R$)</label>
            <input type="number" value={valor} step={0.01} min={0.01} onChange={(e) => setValor(e.target.value === "" ? "" : Number(e.target.value))} required
              placeholder="0,00"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500 transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de Vencimento</label>
            <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors" />
          </div>

          <div className="flex items-end pb-1.5">
            <button type="button" onClick={() => setRecorrente(!recorrente)}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 w-full text-left transition-colors">
              <div className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${recorrente ? "bg-slate-900" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${recorrente ? "left-4" : "left-0.5"}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Despesa Recorrente</p>
                <p className="text-[9px] text-slate-400">Repete mensalmente</p>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex gap-2">
          <button type="submit" disabled={loading}
            className="flex-1 rounded-xl bg-slate-900 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors">
            {loading ? "Cadastrando..." : "Cadastrar Despesa"}
          </button>
          <Link href="/financeiro"
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
