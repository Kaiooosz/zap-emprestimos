"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EvolucaoMes } from "@/types/dashboard";
import { formatarMoeda } from "@/lib/utils";
import { TrendingUp, ChevronDown } from "lucide-react";

interface GraficoEvolucaoProps {
  dados: EvolucaoMes[];
  trend?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl text-xs">
      <p className="font-medium text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-slate-100">{formatarMoeda(payload[0].value)}</p>
    </div>
  );
}

export function GraficoEvolucao({ dados, trend }: GraficoEvolucaoProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs text-slate-500">Volume de Emprestimos</p>
          {trend !== undefined && (
            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1 mt-0.5">
              <TrendingUp size={11} />
              +{trend}% este mes
            </p>
          )}
        </div>
        <button className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-200 hover:text-slate-300 transition-colors">
          Volume de Emprestimo
          <ChevronDown size={12} />
        </button>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={dados} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="zapBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a78c0" stopOpacity={0.20} />
              <stop offset="100%" stopColor="#4a78c0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#152035" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#4a607a" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#4a607a" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#1a2f45", strokeWidth: 1 }} />
          <Area type="monotone" dataKey="recebido" stroke="#6b8ab0" strokeWidth={1.5} fill="url(#zapBlue)"
            dot={{ fill: "#6b8ab0", r: 2.5, strokeWidth: 0 }}
            activeDot={{ fill: "#8aaac8", r: 3.5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
