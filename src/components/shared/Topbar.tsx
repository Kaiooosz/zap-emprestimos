"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Bell, LogOut, X, User, Menu, Search } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { allLinks } from "./Sidebar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Evento {
  id: string;
  userNome: string | null;
  acao: string;
  detalhes: string;
  createdAt: string;
  href?: string;
}

export function Topbar() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [temNovidades, setTemNovidades] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [role, setRole] = useState<string>("OPERADOR");

  const hoje = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  useEffect(() => {
    fetch("/api/perfil")
      .then(res => res.json())
      .then(data => {
        if (data && data.role) setRole(data.role);
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const res = await fetch("/api/eventos");
        if (res.ok) {
          const data = await res.json();
          setEventos(data);

          // Verifica se o ultimo evento retornado eh diferente do ultimo visto
          const ultimoVisto = localStorage.getItem("ultimo_evento_visto");
          if (data.length > 0 && data[0].id !== ultimoVisto) {
            setTemNovidades(true);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
      }
    };

    fetchEventos();
    const interval = setInterval(fetchEventos, 15000); // polling a cada 15s
    return () => clearInterval(interval);
  }, []);

  const handleBellClick = () => {
    setDropdownOpen(!dropdownOpen);
    setTemNovidades(false);
    if (eventos.length > 0) {
      localStorage.setItem("ultimo_evento_visto", eventos[0].id);
    }
  };

  function formatarTempo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}m atrás`;

    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `${diffHoras}h atrás`;

    const diffDias = Math.floor(diffHoras / 24);
    return `${diffDias}d atrás`;
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 relative z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/logo-zap-text-only.png"
            alt="Zap Empréstimos"
            width={180}
            height={60}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Barra de Pesquisa Global (Desktop) */}
      <div className="flex flex-1 items-center justify-end px-4 md:px-8">
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const v = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value; 
          if (v) router.push(`/clientes?busca=${encodeURIComponent(v)}`); 
        }} className="relative w-full max-w-md hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input name="q" type="text" placeholder="Pesquisar clientes no sistema..." 
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all" />
        </form>
      </div>

      <div className="flex items-center gap-2">
        {/* Menu de Notificacoes Sino */}
        <div className="relative">
          <button 
            onClick={handleBellClick}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors relative cursor-pointer"
          >
            <Bell size={15} />
            {temNovidades && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-700 ring-2 ring-white" />
            )}
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop invisivel para fechar o dropdown ao clicar fora */}
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <span className="text-xs font-bold text-slate-900">Atividades Recentes</span>
                  <button 
                    onClick={() => setDropdownOpen(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 divide-y divide-slate-50">
                  {eventos.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-6">Sem atividades recentes no momento.</p>
                  ) : (
                    eventos.map((ev) => {
                      const content = (
                        <>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-slate-950 truncate max-w-[150px]">
                              {ev.userNome || "Sistema"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                              {formatarTempo(ev.createdAt)}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-normal font-medium">{ev.detalhes}</p>
                          <span className={`inline-block mt-1 text-[8px] uppercase tracking-wider font-bold px-1 rounded ${ev.href ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {ev.acao.replace(/_/g, " ")}
                          </span>
                        </>
                      );

                      return ev.href ? (
                        <Link 
                          key={ev.id} 
                          href={ev.href}
                          onClick={() => setDropdownOpen(false)}
                          className="block text-[11px] pt-2 pb-2 first:pt-0 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-lg cursor-pointer"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={ev.id} className="text-[11px] pt-2 pb-2 first:pt-0 px-2 -mx-2">
                          {content}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-100 pt-2 mt-2 text-center">
                  <Link 
                    href="/atividades" 
                    onClick={() => setDropdownOpen(false)}
                    className="text-[10px] font-bold text-blue-700 hover:underline block"
                  >
                    Ver todas as atividades
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mobile: so icone */}
        <Link
          href="/emprestimos/novo"
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
          title="Novo Empréstimo"
        >
          <Plus size={16} strokeWidth={2.5} />
        </Link>
        {/* Desktop: icone + texto */}
        <Link
          href="/emprestimos/novo"
          className="hidden md:flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} />
          Novo Emprestimo
        </Link>

        {/* Link Meu Perfil */}
        <Link
          href="/perfil"
          title="Meu Perfil"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <User size={15} />
        </Link>

        <button
          onClick={logout}
          title="Sair"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <LogOut size={15} />
        </button>
      </div>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-sm bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
              <Image src="/logo-zap-text-only.png" alt="Zap" width={120} height={40} className="h-8 w-auto object-contain" />
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
              <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Menu Completo</p>
              {allLinks.map(({ href, label, icon: Icon, adminOnly }) => {
                if (adminOnly && role !== "ADMIN") return null;
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? "text-blue-600" : "text-slate-400"} />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} strokeWidth={2} className="text-red-500" />
                Sair do sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
