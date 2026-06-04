"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha]  = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Erro ao entrar.");
      } else {
        const params = new URLSearchParams(window.location.search);
        router.push(params.get("next") ?? "/dashboard");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/logo-zap-semfundo.png" alt="Zap Empréstimos" width={180} height={50} className="h-12 w-auto mx-auto" />
          </Link>
          <p className="text-sm text-slate-500 mt-3">Acesse sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            {erro && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {erro}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zap.com"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={verSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <button type="button" onClick={() => setVerSenha(!verSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {verSenha ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
                <input type="checkbox" className="rounded accent-blue-700" />
                Manter conectado
              </label>
              <button type="button" className="text-blue-700 hover:underline font-medium">Esqueci a senha</button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? "Entrando..." : "Entrar na conta"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Nao tem conta?{" "}
            <Link href="/register" className="text-blue-700 font-semibold hover:underline">Criar agora</Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
          <p className="text-xs text-blue-600 font-medium">Acesso demo</p>
          <p className="text-xs text-blue-500 mt-0.5">admin@zap.com / admin123</p>
        </div>
      </div>
    </div>
  );
}
