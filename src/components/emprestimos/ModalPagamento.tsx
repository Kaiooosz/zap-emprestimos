"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CreditCard, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { Parcela } from "@/lib/store";
import { formatarMoeda, formatarData } from "@/lib/utils";

interface Props {
  parcela: Parcela;
  saldoDevedor: number;
  onClose: () => void;
}

type Modo = "COMPLETO" | "SOMENTE_JUROS" | "QUITACAO_TOTAL";

export function ModalPagamento({ parcela, saldoDevedor, onClose }: Props) {
  const [modo, setModo] = useState<Modo>("COMPLETO");
  const [desconto, setDesconto] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const valorQuitacao = Math.round(saldoDevedor * (1 - desconto / 100) * 100) / 100;

  async function confirmar() {
    setLoading(true);
    const body =
      modo === "QUITACAO_TOTAL"
        ? { modo, valorPago: valorQuitacao }
        : modo === "SOMENTE_JUROS"
        ? { modo, valorPago: parcela.valorJuros }
        : { modo, valorPago: parcela.valorDevido };

    await fetch(`/api/parcelas/${parcela.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-white">Registrar Pagamento</h2>
            <p className="text-xs text-slate-500 mt-0.5">Parcela {parcela.numero} · Vence {formatarData(parcela.dataVencimento)}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        {/* Opções */}
        <div className="p-5 space-y-3">
          {[
            {
              id: "COMPLETO" as Modo,
              icon: CreditCard,
              label: "Pagar Parcela Completa",
              desc: `Principal + Juros — ${formatarMoeda(parcela.valorDevido)}`,
              detail: `Principal: ${formatarMoeda(parcela.valorPrincipal)} · Juros: ${formatarMoeda(parcela.valorJuros)}`,
              cor: "text-slate-300",
            },
            {
              id: "SOMENTE_JUROS" as Modo,
              icon: Zap,
              label: "Pagar Só os Juros",
              desc: `Adia o principal — Paga ${formatarMoeda(parcela.valorJuros)}`,
              detail: `O principal de ${formatarMoeda(parcela.valorPrincipal)} é adicionado à próxima parcela`,
              cor: "text-amber-400",
              warn: true,
            },
            {
              id: "QUITACAO_TOTAL" as Modo,
              icon: CheckCircle2,
              label: "Quitar Tudo de Uma Vez",
              desc: `Saldo devedor: ${formatarMoeda(saldoDevedor)}`,
              detail: "Liquida todas as parcelas pendentes do contrato",
              cor: "text-emerald-400",
            },
          ].map(({ id, icon: Icon, label, desc, detail, cor, warn }) => (
            <button key={id} onClick={() => setModo(id)}
              className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${modo === id ? "bg-slate-50 border-slate-500" : "border-slate-200 hover:border-slate-600"}`}>
              <Icon size={18} className={`mt-0.5 shrink-0 ${cor}`} />
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${modo === id ? "text-white" : "text-slate-300"}`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                {modo === id && <p className="text-xs text-slate-500 mt-1">{detail}</p>}
                {warn && modo === id && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-400">
                    <AlertTriangle size={11} /> O principal acumula na próxima parcela
                  </div>
                )}
              </div>
            </button>
          ))}

          {/* Desconto para quitação */}
          {modo === "QUITACAO_TOTAL" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Desconto negociado</span>
                <span className="text-slate-200 font-semibold">{desconto}%</span>
              </div>
              <input type="range" min={0} max={30} value={desconto} onChange={(e) => setDesconto(Number(e.target.value))}
                className="w-full accent-slate-400" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Valor a pagar</span>
                <span className="text-base font-bold text-emerald-400">{formatarMoeda(valorQuitacao)}</span>
              </div>
              {desconto > 0 && (
                <p className="text-xs text-slate-500">Desconto de {formatarMoeda(saldoDevedor - valorQuitacao)} sobre o saldo total</p>
              )}
            </div>
          )}
        </div>

        {/* Resumo + Botão */}
        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-4 py-3">
            <span className="text-xs text-slate-400">Valor a receber</span>
            <span className="text-lg font-bold text-white">
              {modo === "SOMENTE_JUROS" && formatarMoeda(parcela.valorJuros)}
              {modo === "COMPLETO"      && formatarMoeda(parcela.valorDevido)}
              {modo === "QUITACAO_TOTAL"&& formatarMoeda(valorQuitacao)}
            </span>
          </div>
          <button onClick={confirmar} disabled={loading}
            className="w-full rounded-xl border border-blue-700 bg-blue-700 py-3 text-sm font-bold text-slate-200 hover:bg-blue-800 disabled:opacity-60 transition-colors">
            {loading ? "Registrando..." : "Confirmar Pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
