"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { EvolucaoMes } from "@/types/dashboard";
import { formatarMoeda } from "@/lib/utils";

interface GraficoBarrasProps {
  dados: EvolucaoMes[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-slate-500 mb-1 uppercase tracking-wider">{label}</p>
      <p className="font-bold text-slate-900 text-sm">{formatarMoeda(payload[0].value)}</p>
    </div>
  );
}

export function GraficoBarras({ dados }: GraficoBarrasProps) {
  const max = Math.max(...dados.map((d) => d.recebido), 1);
  const ultimoMes = dados[dados.length - 1]?.recebido ?? 0;

  return (
    <div>
      {/* Valor destaque */}
      <div className="mb-3">
        <p className="text-lg font-black text-slate-900 tabular-nums">{formatarMoeda(ultimoMes)}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">recebido no ultimo mes</p>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={dados} barSize={24} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="recebido" radius={[4, 4, 0, 0]}>
            {dados.map((_, i) => (
              <Cell
                key={i}
                fill={i === dados.length - 1 ? "#1d4ed8" : "#e2e8f0"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Labels dos meses (substituindo o eixo quando necessário) */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-[#1d4ed8]" />
            <span className="text-xs text-slate-500">Mes atual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-slate-200" />
            <span className="text-xs text-slate-500">Meses anteriores</span>
          </div>
        </div>
      </div>
    </div>
  );
}
