import { Plus, UsersRound, Shield, Bike, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

const roleConfig: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  ADMIN:    { label: "Admin",    icon: Shield, color: "border-slate-200 text-slate-700 bg-slate-50" },
  COBRADOR: { label: "Cobrador", icon: Bike,   color: "border-blue-200 text-blue-700 bg-blue-50" },
  OPERADOR: { label: "Operador", icon: User,   color: "border-slate-200 text-slate-600 bg-slate-50" },
};

export default async function EquipePage() {
  const membros = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Equipe</h1>
          <p className="text-xs text-slate-400 mt-0.5">{membros.filter((m) => m.ativo).length} membros ativos</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          <Plus size={14} strokeWidth={2} />
          Adicionar Membro
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {membros.map((m) => {
          const cfg = roleConfig[m.role];
          const Icon = cfg.icon;
          return (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-base font-bold text-slate-700 shrink-0">
                  {m.nome[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{m.nome}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{m.email}</p>
                  {m.phone && <p className="text-xs text-slate-400 mt-0.5">{m.phone}</p>}
                </div>
                {!m.ativo && (
                  <span className="text-xs text-slate-400 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-full shrink-0">
                    Inativo
                  </span>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
                  <Icon size={11} />
                  {cfg.label}
                </div>
                <p className="text-xs text-slate-400">Desde {formatarData(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
