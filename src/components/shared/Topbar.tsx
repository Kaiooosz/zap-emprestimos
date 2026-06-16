"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Bell, LogOut, X, User } from "lucide-react";
import Image from "next/image";

interface Evento {
  id: string;
  userNome: string | null;
  acao: string;
  detalhes: string;
  createdAt: string;
}

export function Topbar() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [temNovidades, setTemNovidades] = useState(false);

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
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <Link href="/dashboard" className="flex items-center">
        <Image
          src="/logo-zap-semfundo.png"
          alt="Zap Empréstimos"
          width={150}
          height={40}
          priority
          className="h-8 w-auto object-contain"
        />
      </Link>
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
                    eventos.map((ev) => (
                      <div key={ev.id} className="text-[11px] pt-2 first:pt-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-slate-950 truncate max-w-[150px]">
                            {ev.userNome || "Sistema"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                            {formatarTempo(ev.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-normal font-medium">{ev.detalhes}</p>
                        <span className="inline-block mt-1 text-[8px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 px-1 rounded">
                          {ev.acao.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))
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
    </header>
  );
}
