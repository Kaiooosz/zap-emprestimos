"use client";

import Link from "next/link";
import { Plus, Bell } from "lucide-react";
import Image from "next/image";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
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
      <div className="flex items-center gap-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <Bell size={15} />
        </button>
        <Link
          href="/emprestimos/novo"
          className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} />
          Novo Emprestimo
        </Link>
      </div>
    </header>
  );
}
