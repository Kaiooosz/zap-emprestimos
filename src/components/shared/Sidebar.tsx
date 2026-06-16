"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { PanelLeftClose, PanelLeftOpen,
  LayoutDashboard, HandCoins, Users, CalendarDays,
  Wallet, UsersRound, Calculator, BarChart3, Settings, MessageSquare, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const allLinks = [
  { href: "/dashboard",     label: "Dashboard",   icon: LayoutDashboard },
  { href: "/emprestimos",   label: "Contratos",   icon: HandCoins },
  { href: "/clientes",      label: "Clientes",    icon: Users },
  { href: "/cobrancas",     label: "Cobranças",   icon: MessageSquare },
  { href: "/atividades",    label: "Atividades",  icon: Activity },
  { href: "/relatorios",    label: "Relatórios",  icon: BarChart3 },
  { href: "/simulador",     label: "Simulador",   icon: Calculator },
  { href: "/calendario",    label: "Calendário",  icon: CalendarDays },
  { href: "/financeiro",    label: "Financeiro",  icon: Wallet },
  { href: "/equipe",        label: "Equipe",      icon: UsersRound, adminOnly: true },
  { href: "/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string>("OPERADOR");

  useEffect(() => {
    fetch("/api/perfil")
      .then(res => res.json())
      .then(data => {
        if (data && data.role) setRole(data.role);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-52"
      )}
    >
      {/* Logo + toggle */}
      <div className="flex h-14 items-center border-b border-slate-100 px-3 gap-2">
        <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0">
          <Image
            src="/logo-icon.png"
            alt="Zap"
            width={34}
            height={34}
            priority
            className="h-8 w-8 object-contain shrink-0"
          />
          {!collapsed && (
            <span className="text-sm font-bold text-slate-900 truncate">Zap Empréstimos</span>
          )}
        </Link>
        <button
          onClick={toggle}
          className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 py-3 px-2 overflow-y-auto">
        {allLinks.map(({ href, label, icon: Icon, adminOnly }) => {
          if (adminOnly && role !== "ADMIN") return null;
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-all",
                collapsed ? "justify-center w-10 mx-auto" : "w-full",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-blue-600" />
              )}
              <Icon size={16} strokeWidth={active ? 2 : 1.8} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
