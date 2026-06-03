"use client";

import { useState } from "react";
import { MessageCircle, CheckCircle, Phone } from "lucide-react";
import { ParcelaHoje } from "@/types/dashboard";
import { formatarMoeda } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ParcelasHojeProps {
  parcelas: ParcelaHoje[];
}

export function ParcelasHoje({ parcelas }: ParcelasHojeProps) {
  const [cobrandoId, setCobrandoId] = useState<string | null>(null);

  async function cobrarParcela(parcelaId: string, phone: string, valor: number) {
    setCobrandoId(parcelaId);
    try {
      await fetch(`/api/parcelas/${parcelaId}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, valor }),
      });
    } finally {
      setCobrandoId(null);
    }
  }

  if (parcelas.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Cobranças de Hoje</h3>
        <p className="text-sm text-gray-400 text-center py-6">Nenhuma parcela para hoje</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Cobranças de Hoje</h3>
        <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-full">
          {parcelas.length} pendente{parcelas.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {parcelas.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{p.clienteNome}</p>
              <p className="text-xs text-gray-400">{p.clientePhone}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={cn(
                "text-sm font-bold",
                p.status === "ATRASADO" ? "text-red-600" : "text-gray-800"
              )}>
                {formatarMoeda(p.valorDevido)}
              </p>
              {p.status === "ATRASADO" && (
                <p className="text-xs text-red-500">Atrasado</p>
              )}
            </div>
            <button
              onClick={() => cobrarParcela(p.id, p.clientePhone, p.valorDevido)}
              disabled={cobrandoId === p.id}
              className="shrink-0 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              <MessageCircle size={13} />
              Cobrar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
