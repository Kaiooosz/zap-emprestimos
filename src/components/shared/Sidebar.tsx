"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, HandCoins, Users, CalendarDays,
  Wallet, UsersRound, Calculator, BarChart3, Settings, MessageSquare, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard",     label: "Dashboard",  icon: LayoutDashboard },
  { href: "/emprestimos",   label: "Contratos",  icon: HandCoins },
  { href: "/clientes",      label: "Clientes",   icon: Users },
  { href: "/cobrancas",     label: "Cobranças",  icon: MessageSquare },
  { href: "/atividades",    label: "Atividades", icon: Activity },
  { href: "/relatorios",    label: "Relatorios", icon: BarChart3 },
  { href: "/simulador",     label: "Simulador",  icon: Calculator },
  { href: "/calendario",    label: "Calendario", icon: CalendarDays },
  { href: "/financeiro",    label: "Financeiro", icon: Wallet },
  { href: "/equipe",        label: "Equipe",     icon: UsersRound },
  { href: "/configuracoes", label: "Config",     icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-16 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-center border-b border-slate-100">
        <Link href="/dashboard">
          <Image
            src="/logo-icon.png"
            alt="Zap"
            width={34}
            height={34}
            priority
            className="h-8 w-8 object-contain"
          />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-0.5 py-3 px-2 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.8} />
              {active && <span className="absolute left-0 h-4 w-0.5 rounded-r-full bg-blue-600" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
