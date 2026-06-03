import Link from "next/link";
import Image from "next/image";
import { HandCoins, Shield, MessageSquare, BarChart3, CheckCircle, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image src="/logo-zap-semfundo.png" alt="Zap Empréstimos" width={140} height={38} className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Entrar
            </Link>
            <Link href="/register" className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 mb-8">
          <CheckCircle size={13} />
          Sistema completo de gestao de emprestimos
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          Gerencie seus emprestimos<br />
          <span className="text-blue-700">com precisao e eficiencia</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
          Controle de cobranças, score de clientes, disparo automatico via WhatsApp e
          relatorios financeiros — tudo em um unico sistema.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="flex items-center gap-2 rounded-xl bg-blue-700 px-8 py-3.5 text-base font-bold text-white hover:bg-blue-800 transition-colors">
            Comecar agora
            <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Ja tenho conta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-100">
        <h2 className="text-center text-2xl font-bold text-slate-900 mb-12">Tudo que voce precisa para operar</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: HandCoins,
              title: "Multiplos tipos de emprestimo",
              desc: "Padrao, diario, desconto de cheque, renovacao, venda parcelada, aluguel e assinatura IPTV",
            },
            {
              icon: BarChart3,
              title: "Score de credito 0-1000",
              desc: "Algoritmo automatico avalia historico de pagamentos e classifica clientes em tempo real",
            },
            {
              icon: MessageSquare,
              title: "Cobrancas via WhatsApp",
              desc: "Disparo individual ou em massa com templates personalizaveis e preview antes de enviar",
            },
            {
              icon: Shield,
              title: "Garantias e contratos",
              desc: "Registro de imovel, veiculo, cheque, nota promissoria ou fiador vinculado ao contrato",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Icon size={20} className="text-blue-700" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-blue-700 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Pronto para organizar sua operacao?</h2>
          <p className="text-blue-200 mb-8">Substitua as planilhas e cadernos por um sistema profissional de gestao.</p>
          <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-blue-700 hover:bg-blue-50 transition-colors">
            Criar minha conta gratis
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <Image src="/logo-zap-semfundo.png" alt="Zap Empréstimos" width={100} height={28} className="h-6 w-auto opacity-60" />
          <p className="text-xs text-slate-400">Zap Empréstimos 2.0 — Sistema de gestao financeira</p>
        </div>
      </footer>
    </div>
  );
}
