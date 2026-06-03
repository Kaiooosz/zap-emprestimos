import Link from "next/link";
import { Plus, UsersRound, Shield, Bike, User } from "lucide-react";
import { store } from "@/lib/store";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

const roleConfig: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  ADMIN:    { label: "Admin",    icon: Shield, color: "text-purple-400 bg-purple-400/10" },
  COBRADOR: { label: "Cobrador", icon: Bike,   color: "text-blue-400 bg-blue-400/10" },
  OPERADOR: { label: "Operador", icon: User,   color: "text-slate-400 bg-slate-400/10" },
};

export default function EquipePage() {
  const membros = store.membros.list();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersRound size={20} className="text-blue-700" />
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Equipe</h1>
            <p className="text-sm text-slate-400 mt-0.5">{membros.filter((m) => m.active).length} membros ativos</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl bg-blue-700 border border-blue-600 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-blue-800 transition-colors">
          <Plus size={16} strokeWidth={2.5} />
          Adicionar Membro
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {membros.map((m) => {
          const cfg = roleConfig[m.role];
          const Icon = cfg.icon;
          return (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-[#1e3a5f] flex items-center justify-center text-lg font-bold text-white shrink-0">
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{m.name}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                  {m.phone && <p className="text-xs text-slate-500 mt-0.5">{m.phone}</p>}
                </div>
                {!m.active && <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">Inativo</span>}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.color}`}>
                  <Icon size={12} />
                  {cfg.label}
                </div>
                <p className="text-xs text-slate-500">Desde {formatarData(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
