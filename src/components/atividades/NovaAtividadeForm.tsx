"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Cliente } from "@/lib/store";

const tipos = [
  { value: "PAGAMENTO",   label: "Pagamento recebido" },
  { value: "ACORDO",      label: "Acordo firmado" },
  { value: "CONTATO",     label: "Contato realizado" },
  { value: "RENOVACAO",   label: "Renovacao de contrato" },
  { value: "OBSERVACAO",  label: "Observacao geral" },
];

export function NovaAtividadeForm({ clientes }: { clientes: Cliente[] }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({ tipo: "PAGAMENTO", clienteId: "", descricao: "", valor: "" });
  const [saved, setSaved] = useState(false);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => { setSaved(false); setAberto(false); setForm({ tipo: "PAGAMENTO", clienteId: "", descricao: "", valor: "" }); }, 1500);
  }

  return (
    <>
      <button onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors">
        <Plus size={13} strokeWidth={2.5} />
        Registrar atividade
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setAberto(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Registrar Atividade</h2>
              <button onClick={() => setAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo de Atividade</label>
                <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600">
                  {tipos.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Cliente</label>
                <select value={form.clienteId} onChange={(e) => set("clienteId", e.target.value)} required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="">Selecione...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Descricao</label>
                <textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} rows={3} required
                  placeholder="Descreva o que aconteceu..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor (opcional)</label>
                <input type="number" value={form.valor === "" || form.valor === undefined ? "" : String(Number(form.valor))} onChange={(e) => set("valor", e.target.value)} step="0.01"
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <button type="submit"
                className={`w-full rounded-xl py-3 text-sm font-bold transition-colors ${saved ? "bg-emerald-600 text-white" : "bg-blue-700 text-white hover:bg-blue-800"}`}>
                {saved ? "Registrado!" : "Salvar Atividade"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
