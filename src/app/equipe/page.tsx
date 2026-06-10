"use client";

import { useState, useEffect } from "react";
import { Plus, UsersRound, Shield, Bike, User, X, Save, ToggleLeft, ToggleRight, Loader2, ChevronDown } from "lucide-react";

type Role = "ADMIN" | "OPERADOR" | "COBRADOR";

interface Membro {
  id:         string;
  nome:       string;
  email:      string;
  phone?:     string | null;
  role:       Role;
  ativo:      boolean;
  createdAt:  string;
}

const roleConfig: Record<Role, { label: string; icon: typeof Shield; color: string }> = {
  ADMIN:    { label: "Admin",    icon: Shield, color: "border-blue-200 text-blue-700 bg-blue-50" },
  COBRADOR: { label: "Cobrador", icon: Bike,   color: "border-amber-200 text-amber-700 bg-amber-50" },
  OPERADOR: { label: "Operador", icon: User,   color: "border-slate-200 text-slate-600 bg-slate-50" },
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EquipePage() {
  const [membros,    setMembros]    = useState<Membro[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modalAberto, setModal]     = useState(false);
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState("");

  // Formulário novo membro
  const [form, setForm] = useState({ nome: "", email: "", phone: "", role: "OPERADOR" as Role, senha: "" });

  // Menu de ações por card
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/equipe")
      .then((r) => r.json())
      .then((data) => { setMembros(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function criarMembro(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const res  = await fetch("/api/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao criar membro."); return; }
      setMembros((prev) => [...prev, data]);
      setModal(false);
      setForm({ nome: "", email: "", phone: "", role: "OPERADOR", senha: "" });
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarRole(id: string, role: Role) {
    const res  = await fetch(`/api/equipe/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const data = await res.json();
      setMembros((prev) => prev.map((m) => (m.id === id ? data : m)));
    }
    setMenuAberto(null);
  }

  async function alterarStatus(id: string, ativo: boolean) {
    const res  = await fetch(`/api/equipe/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo }),
    });
    if (res.ok) {
      const data = await res.json();
      setMembros((prev) => prev.map((m) => (m.id === id ? data : m)));
    }
    setMenuAberto(null);
  }

  async function removerMembro(id: string) {
    if (!confirm("Remover membro? Se houver contratos vinculados, ele será desativado.")) return;
    const res = await fetch(`/api/equipe/${id}`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        setMembros((prev) => prev.filter((m) => m.id !== id));
      } else {
        // Foi desativado, não removido
        setMembros((prev) => prev.map((m) => (m.id === id ? { ...m, ativo: false } : m)));
      }
    }
    setMenuAberto(null);
  }

  const ativos = membros.filter((m) => m.ativo).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersRound size={20} className="text-blue-700" />
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Equipe</h1>
            <p className="text-xs text-slate-400 mt-0.5">{ativos} membro{ativos !== 1 ? "s" : ""} ativo{ativos !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Adicionar Membro
        </button>
      </div>

      {/* Grid de cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : membros.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          Nenhum membro cadastrado. Adicione o primeiro membro.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {membros.map((m) => {
            const cfg  = roleConfig[m.role];
            const Icon = cfg.icon;
            return (
              <div key={m.id} className={`relative rounded-xl border bg-white p-5 shadow-sm transition-all ${m.ativo ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
                {/* Ações */}
                <div className="absolute top-4 right-4">
                  <div className="relative">
                    <button
                      onClick={() => setMenuAberto(menuAberto === m.id ? null : m.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <ChevronDown size={14} />
                    </button>
                    {menuAberto === m.id && (
                      <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Alterar Role</p>
                        {(["ADMIN", "OPERADOR", "COBRADOR"] as Role[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => alterarRole(m.id, r)}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${m.role === r ? "font-semibold text-blue-700" : "text-slate-700"}`}
                          >
                            {roleConfig[r].label} {m.role === r && "(atual)"}
                          </button>
                        ))}
                        <div className="border-t border-slate-100 my-1" />
                        <button
                          onClick={() => alterarStatus(m.id, !m.ativo)}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                          {m.ativo ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                          {m.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          onClick={() => removerMembro(m.id)}
                          className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="flex items-start gap-3 pr-8">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-base font-bold text-slate-700 shrink-0">
                    {m.nome[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{m.nome}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{m.email}</p>
                    {m.phone && <p className="text-xs text-slate-400 mt-0.5">{m.phone}</p>}
                  </div>
                  {!m.ativo && (
                    <span className="text-[10px] text-slate-400 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                      Inativo
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
                    <Icon size={11} />
                    {cfg.label}
                  </div>
                  <p className="text-xs text-slate-400">Desde {formatarData(m.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — Adicionar Membro */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Adicionar Membro</h2>
              <button onClick={() => { setModal(false); setErro(""); }} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={criarMembro} className="p-6 space-y-4">
              {erro && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">{erro}</div>
              )}

              <Field label="Nome completo" required
                value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))}
                placeholder="Ex: João Silva"
              />
              <Field label="E-mail" type="email" required
                value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="joao@exemplo.com"
              />
              <Field label="Telefone (opcional)"
                value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="(11) 99000-0000"
              />
              <Field label="Senha" type="password" required
                value={form.senha} onChange={(v) => setForm((f) => ({ ...f, senha: v }))}
                placeholder="Mínimo 6 caracteres"
              />

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Função (Role)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ADMIN", "OPERADOR", "COBRADOR"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={`rounded-xl border py-2.5 text-xs font-semibold transition-all ${form.role === r ? "bg-blue-700 border-blue-700 text-white" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}
                    >
                      {roleConfig[r].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModal(false); setErro(""); }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 hover:border-slate-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
                >
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {salvando ? "Salvando..." : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overlay para fechar menu de ações */}
      {menuAberto && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)} />
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}
