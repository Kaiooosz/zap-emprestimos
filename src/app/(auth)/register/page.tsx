"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Building2, Mail, Phone, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", empresa: "", email: "", phone: "", senha: "", confirmar: "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.senha !== form.confirmar) return alert("As senhas nao coincidem.");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/dashboard?new=true");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/logo-zap-semfundo.png" alt="Zap Empréstimos" width={180} height={50} className="h-12 w-auto mx-auto" />
          </Link>
          <p className="text-sm text-slate-500 mt-3">Crie sua conta e comece a operar</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <F label="Nome completo" value={form.nome} onChange={(v) => set("nome", v)} icon={<User size={14}/>} required />
              </div>
              <div className="col-span-2">
                <F label="Nome da empresa" value={form.empresa} onChange={(v) => set("empresa", v)} icon={<Building2 size={14}/>} required />
              </div>
              <F label="E-mail" value={form.email} onChange={(v) => set("email", v)} icon={<Mail size={14}/>} type="email" required />
              <F label="Telefone" value={form.phone} onChange={(v) => set("phone", v)} icon={<Phone size={14}/>} />
              <F label="Senha" value={form.senha} onChange={(v) => set("senha", v)} icon={<Lock size={14}/>} type="password" required />
              <F label="Confirmar senha" value={form.confirmar} onChange={(v) => set("confirmar", v)} icon={<Lock size={14}/>} type="password" required />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Ao criar sua conta voce concorda com os Termos de Servico e a Politica de Privacidade da Zap Emprestimos.
            </p>

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors">
              {loading ? "Criando conta..." : "Criar minha conta"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Ja tem conta?{" "}
            <Link href="/login" className="text-blue-700 font-semibold hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, icon, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void;
  icon: React.ReactNode; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" />
      </div>
    </div>
  );
}
