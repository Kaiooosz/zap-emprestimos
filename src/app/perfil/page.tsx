"use client";

import { useState, useEffect } from "react";
import { User, Shield, Bike, Save, Loader2, KeyRound } from "lucide-react";

type Role = "ADMIN" | "OPERADOR" | "COBRADOR";

interface PerfilData {
  id: string;
  nome: string;
  email: string;
  phone: string | null;
  role: Role;
  ativo: boolean;
  createdAt: string;
}

const roleConfig: Record<Role, { label: string; icon: typeof Shield; color: string }> = {
  ADMIN:    { label: "Administrador", icon: Shield, color: "border-blue-200 text-blue-700 bg-blue-50" },
  COBRADOR: { label: "Cobrador",      icon: Bike,   color: "border-amber-200 text-amber-700 bg-amber-50" },
  OPERADOR: { label: "Operador",      icon: User,   color: "border-slate-200 text-slate-600 bg-slate-50" },
};

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  
  const [form, setForm] = useState({ nome: "", email: "", phone: "", senha: "" });
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    fetch("/api/perfil")
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPerfil(data);
          setForm({ nome: data.nome, email: data.email, phone: data.phone || "", senha: "" });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao atualizar perfil.");
      } else {
        setSucesso("Perfil atualizado com sucesso!");
        setForm(prev => ({ ...prev, senha: "" }));
        setPerfil(data);
      }
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!perfil) {
    return <p className="text-center text-slate-500 mt-10">Não foi possível carregar o perfil.</p>;
  }

  const { icon: RoleIcon, label: roleLabel, color: roleColor } = roleConfig[perfil.role] || roleConfig.OPERADOR;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie suas informações pessoais e credenciais de acesso</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <User size={32} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{perfil.nome}</p>
              <p className="text-sm text-slate-500">{perfil.email}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${roleColor}`}>
            <RoleIcon size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">{roleLabel}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {erro && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-600 font-medium">
              {sucesso}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Nome Completo</label>
              <input 
                type="text" 
                value={form.nome}
                onChange={e => setForm({...form, nome: e.target.value})}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">E-mail</label>
              <input 
                type="email" 
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Telefone (WhatsApp)</label>
              <input 
                type="text" 
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="(00) 00000-0000"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={18} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900">Segurança</h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Nova Senha</label>
              <input 
                type="password" 
                value={form.senha}
                onChange={e => setForm({...form, senha: e.target.value})}
                placeholder="Deixe em branco para não alterar"
                className="w-full sm:w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 transition-colors"
              />
              <p className="text-xs text-slate-400">Preencha apenas se desejar alterar sua senha atual.</p>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
            >
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
