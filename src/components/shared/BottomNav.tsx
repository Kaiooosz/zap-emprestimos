"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, HandCoins, Users, MessageSquare, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard",     label: "Dashboard",  icon: LayoutDashboard },
  { href: "/emprestimos",   label: "Contratos",  icon: HandCoins },
  { href: "/clientes",      label: "Clientes",   icon: Users },
  { href: "/cobrancas",     label: "Cobranças",  icon: MessageSquare },
  { href: "/configuracoes", label: "Config",     icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-slate-200 bg-white">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active ? "text-blue-700" : "text-slate-400"
            )}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
