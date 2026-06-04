"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { PerfilFinanceiro } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function PerfisFinanceirosPage() {
  const [perfis, setPerfis] = useState<PerfilFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<PerfilFinanceiro, "id">>({
    nome: "",
    modalidades: ["MODALIDADE_1", "MODALIDADE_2"],
    taxaMensalPct: 10,
    regraAtraso: "A",
    taxaDiariaAtrasoPct: 1,
    prazoMaxParcelado: 12,
    limiteEmprestimo: 10000,
    permitirRenovacao: true,
    maxRenovacoes: 3,
    descontoQuitacaoMaxPct: 10,
  });

  async function carregar() {
    const res = await fetch("/api/perfis");
    const data = await res.json();
    setPerfis(data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function abrirEdicao(p: PerfilFinanceiro) {
    setEditandoId(p.id);
    setCriando(false);
    setForm({
      nome: p.nome,
      modalidades: p.modalidades,
      taxaMensalPct: p.taxaMensalPct,
      regraAtraso: p.regraAtraso,
      taxaDiariaAtrasoPct: p.taxaDiariaAtrasoPct,
      prazoMaxParcelado: p.prazoMaxParcelado,
      limiteEmprestimo: p.limiteEmprestimo,
      permitirRenovacao: p.permitirRenovacao,
      maxRenovacoes: p.maxRenovacoes,
      descontoQuitacaoMaxPct: p.descontoQuitacaoMaxPct,
    });
  }

  function abrirCriacao() {
    setEditandoId(null);
    setCriando(true);
    setForm({
      nome: "",
      modalidades: ["MODALIDADE_1", "MODALIDADE_2"],
      taxaMensalPct: 10,
      regraAtraso: "A",
      taxaDiariaAtrasoPct: 1,
      prazoMaxParcelado: 12,
      limiteEmprestimo: 10000,
      permitirRenovacao: true,
      maxRenovacoes: 3,
      descontoQuitacaoMaxPct: 10,
    });
  }

  function cancelar() {
    setCriando(false);
    setEditandoId(null);
  }

  async function salvar() {
    if (editandoId) {
      await fetch(`/api/perfis/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/perfis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    cancelar();
    carregar();
  }

  const formAtivo = criando || editandoId !== null;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/configuracoes"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Perfis Financeiros</h1>
            <p className="text-xs text-slate-400 mt-0.5">Defina regras de juros e limites por segmento de cliente</p>
          </div>
        </div>
        {!formAtivo && (
          <button onClick={abrirCriacao}
            className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors">
            Criar Perfil
          </button>
        )}
      </div>

      {/* Formulario inline */}
      {formAtivo && (
        <div className="rounded-xl border border-blue-200 bg-white shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {editandoId ? "Editar Perfil" : "Novo Perfil"}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FLabel label="Nome do Perfil">
                <input type="text" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400" />
              </FLabel>
            </div>

            <FLabel label="Taxa Mensal (%)">
              <input type="number" step="0.1" value={form.taxaMensalPct}
                onChange={(e) => setForm((f) => ({ ...f, taxaMensalPct: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400" />
            </FLabel>

            <FLabel label="Taxa de Atraso (% ao dia)">
              <input type="number" step="0.1" value={form.taxaDiariaAtrasoPct}
                onChange={(e) => setForm((f) => ({ ...f, taxaDiariaAtrasoPct: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400" />
            </FLabel>

            <FLabel label="Regra de Atraso">
              <select value={form.regraAtraso}
                onChange={(e) => setForm((f) => ({ ...f, regraAtraso: e.target.value as "A" | "B" }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400">
                <option value="A">A — base parcela inteira</option>
                <option value="B">B — base saldo restante</option>
              </select>
            </FLabel>

            <FLabel label="Max. Parcelas">
              <input type="number" value={form.prazoMaxParcelado}
                onChange={(e) => setForm((f) => ({ ...f, prazoMaxParcelado: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400" />
            </FLabel>

            <FLabel label="Limite de Emprestimo (R$)">
              <input type="number" value={form.limiteEmprestimo}
                onChange={(e) => setForm((f) => ({ ...f, limiteEmprestimo: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400" />
            </FLabel>

            <FLabel label="Max. Renovacoes (0 = ilimitado)">
              <input type="number" value={form.maxRenovacoes}
                onChange={(e) => setForm((f) => ({ ...f, maxRenovacoes: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400" />
            </FLabel>

            <FLabel label="Desconto Quitacao Max. (%)">
              <input type="number" step="0.1" value={form.descontoQuitacaoMaxPct}
                onChange={(e) => setForm((f) => ({ ...f, descontoQuitacaoMaxPct: Number(e.target.value) }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-slate-400" />
            </FLabel>

            <div className="col-span-2 flex items-center gap-4">
              <label className="text-xs font-medium text-slate-500">Permitir Renovacao</label>
              <button type="button" onClick={() => setForm((f) => ({ ...f, permitirRenovacao: !f.permitirRenovacao }))}
                className={`relative h-5 w-9 rounded-full transition-colors ${form.permitirRenovacao ? "bg-blue-600" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.permitirRenovacao ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={salvar}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors">
              {editandoId ? "Salvar Alteracoes" : "Criar Perfil"}
            </button>
            <button onClick={cancelar}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de perfis */}
      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perfis.map((p) => (
            <div key={p.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{p.nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.modalidades.join(", ")}
                  </p>
                </div>
                <button onClick={() => abrirEdicao(p)}
                  className="text-xs text-blue-700 hover:text-blue-900 font-medium shrink-0">
                  Editar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Taxa mensal", value: `${p.taxaMensalPct}%` },
                  { label: "Atraso/dia", value: `${p.taxaDiariaAtrasoPct}%` },
                  { label: "Regra atraso", value: `Regra ${p.regraAtraso}` },
                  { label: "Max parcelas", value: String(p.prazoMaxParcelado) },
                  { label: "Limite", value: `R$ ${p.limiteEmprestimo.toLocaleString("pt-BR")}` },
                  { label: "Desc. quitacao", value: `${p.descontoQuitacaoMaxPct}%` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>{p.permitirRenovacao ? `Renovacao: max ${p.maxRenovacoes === 0 ? "ilimitado" : p.maxRenovacoes}` : "Sem renovacao"}</span>
              </div>
            </div>
          ))}

          {perfis.length === 0 && (
            <p className="col-span-3 py-10 text-center text-sm text-slate-400">Nenhum perfil cadastrado</p>
          )}
        </div>
      )}
    </div>
  );
}

function FLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
