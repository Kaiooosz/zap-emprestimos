"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, CreditCard, Zap, CheckCircle2, Clock } from "lucide-react";
import { Parcela } from "@/lib/store";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { calcularPagamentoAntecipado, calcularJurosAtraso } from "@/lib/calculo/juros";

interface Props {
  parcela: Parcela;
  saldoDevedor: number;
  taxaJuros: number;
  dataInicioPeriodo: string;
  regraAtraso: string;
  taxaAtraso: number;
  tipoTaxaAtraso: string;
  onClose: () => void;
}

type Modo = "COMPLETO" | "SOMENTE_JUROS" | "ANTECIPADO" | "QUITACAO_TOTAL";

export function ModalPagamento({ parcela, saldoDevedor, taxaJuros, dataInicioPeriodo, regraAtraso, taxaAtraso, tipoTaxaAtraso, onClose }: Props) {
  const [modo, setModo]         = useState<Modo>("COMPLETO");
  const [desconto, setDesconto] = useState(0);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const hoje = new Date();
  const venc = new Date(parcela.dataVencimento);
  const diasAntecipados = Math.max(0, Math.floor((venc.getTime() - hoje.getTime()) / 86400000));
  const podeAntecipar   = diasAntecipados > 0;

  const atraso = useMemo(() => {
    const isAtrasado = parcela.status === "ATRASADO" || (new Date().getTime() > new Date(parcela.dataVencimento).getTime() && parcela.status !== "PAGO");
    if (!isAtrasado) return null;

    const base = regraAtraso === "SALDO"
      ? Math.max(0, Number(parcela.valorDevido) - Number(parcela.valorPago ?? 0))
      : Number(parcela.valorDevido);

    return calcularJurosAtraso(
      base,
      new Date(parcela.dataVencimento),
      taxaAtraso,
      regraAtraso === "SALDO" ? "saldo" : "parcela",
      tipoTaxaAtraso as "PERCENTUAL" | "VALOR"
    );
  }, [parcela, regraAtraso, taxaAtraso, tipoTaxaAtraso]);

  const antecipado = useMemo(() =>
    podeAntecipar
      ? calcularPagamentoAntecipado(
          new Date(parcela.dataVencimento),
          new Date(dataInicioPeriodo),
          parcela.valorDevido,
          parcela.valorPrincipal,
          parcela.valorJuros,
          taxaJuros
        )
      : null,
    [parcela, dataInicioPeriodo, taxaJuros, podeAntecipar]
  );

  const valorQuitacao = Math.round(saldoDevedor * (1 - desconto / 100) * 100) / 100;
  const valorFinal =
    modo === "SOMENTE_JUROS"  ? parcela.valorJuros :
    modo === "ANTECIPADO"     ? (antecipado?.valorComDesconto ?? parcela.valorDevido) :
    modo === "QUITACAO_TOTAL" ? valorQuitacao :
    atraso                    ? atraso.valorAtualizado : parcela.valorDevido;

  async function confirmar() {
    setLoading(true);
    await fetch(`/api/parcelas/${parcela.id}/pagar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modo,
        valorPago: valorFinal,
        descontoAntecipado: modo === "ANTECIPADO" ? antecipado?.descontoJuros : undefined,
        diasAntecipados: modo === "ANTECIPADO" ? antecipado?.diasAntecipados : undefined,
      }),
    });
    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Registrar Pagamento</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Parcela {parcela.numero} · Vence {formatarData(parcela.dataVencimento)}
              {diasAntecipados > 0 && <span className="ml-1.5 text-blue-600 font-medium">({diasAntecipados}d antes)</span>}
              {atraso && atraso.diasAtraso > 0 && <span className="ml-1.5 text-red-600 font-medium">({atraso.diasAtraso}d atraso)</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
        </div>

        {/* Alerta de atraso */}
        {atraso && atraso.diasAtraso > 0 && (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-1">
              Juros de atraso ({atraso.diasAtraso} dias a {tipoTaxaAtraso === "VALOR" ? `R$ ${taxaAtraso}` : `${taxaAtraso}%`}/dia)
            </p>
            <div className="flex justify-between text-xs font-bold text-red-700 mt-1">
              <span>Total com juros de atraso</span>
              <span>{formatarMoeda(atraso.valorAtualizado)}</span>
            </div>
          </div>
        )}

        <div className="p-5 space-y-2">
          {/* Opção 1: Completo */}
          <OpcaoPagamento id="COMPLETO" modo={modo} onSelect={setModo}
            icon={CreditCard} label="Pagar Parcela Completa"
            desc={`${formatarMoeda(atraso ? atraso.valorAtualizado : parcela.valorDevido)}`}
            detail={`Principal: ${formatarMoeda(parcela.valorPrincipal)} · Juros: ${formatarMoeda(parcela.valorJuros)}`}
          />

          {/* Opção 2: Antecipado (só se for antes do vencimento) */}
          {podeAntecipar && antecipado && (
            <OpcaoPagamento id="ANTECIPADO" modo={modo} onSelect={setModo}
              icon={Clock} label="Pagamento Antecipado"
              desc={`Pro-rata — ${formatarMoeda(antecipado.valorComDesconto)}`}
              detail={`${antecipado.diasUsados} dias usados · Desconto: ${formatarMoeda(antecipado.descontoJuros)} (${antecipado.percentualDesconto}%)`}
              badge="Desconto"
            />
          )}

          {/* Opção 3: Só juros */}
          <OpcaoPagamento id="SOMENTE_JUROS" modo={modo} onSelect={setModo}
            icon={Zap} label="Pagar Só os Juros"
            desc={`Adia principal — ${formatarMoeda(parcela.valorJuros)}`}
            detail={`Principal de ${formatarMoeda(parcela.valorPrincipal)} vai para a próxima parcela`}
          />

          {/* Opção 4: Quitar tudo */}
          <OpcaoPagamento id="QUITACAO_TOTAL" modo={modo} onSelect={setModo}
            icon={CheckCircle2} label="Quitar Tudo de Uma Vez"
            desc={`Saldo: ${formatarMoeda(saldoDevedor)}`}
            detail="Liquida todas as parcelas pendentes do contrato"
          />

          {/* Detalhes antecipação */}
          {modo === "ANTECIPADO" && antecipado && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-blue-800 mb-2">Cálculo pro-rata (proporcional aos dias)</p>
              {[
                ["Juros totais da parcela", formatarMoeda(antecipado.jurosOriginais)],
                [`Juros de ${antecipado.diasUsados} dias usados`, formatarMoeda(antecipado.jurosProRata)],
                [`Desconto (${antecipado.diasAntecipados}d antecipados)`, `-${formatarMoeda(antecipado.descontoJuros)}`],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between text-xs">
                  <span className="text-blue-700">{l}</span>
                  <span className="font-bold text-blue-900">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Desconto quitação */}
          {modo === "QUITACAO_TOTAL" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Desconto negociado: <strong>{desconto}%</strong></span>
                <span className="text-xs text-slate-400">{formatarMoeda(saldoDevedor - valorQuitacao)} de desconto</span>
              </div>
              <input type="range" min={0} max={30} value={desconto}
                onChange={(e) => setDesconto(Number(e.target.value))}
                className="w-full accent-blue-700"/>
              <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-2">
                <span className="text-slate-600">Valor final</span>
                <span className="text-slate-900">{formatarMoeda(valorQuitacao)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <div>
              <p className="text-xs text-slate-500">Valor a receber agora</p>
              {modo === "ANTECIPADO" && antecipado && (
                <p className="text-xs text-blue-600 font-medium mt-0.5">
                  Economia de {formatarMoeda(antecipado.descontoJuros)} ({antecipado.percentualDesconto}%)
                </p>
              )}
            </div>
            <span className="text-2xl font-black text-slate-900 tabular-nums">{formatarMoeda(valorFinal)}</span>
          </div>
          <button onClick={confirmar} disabled={loading}
            className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors">
            {loading ? "Registrando..." : "Confirmar Pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OpcaoPagamento({ id, modo, onSelect, icon: Icon, label, desc, detail, badge }: {
  id: Modo; modo: Modo; onSelect: (m: Modo) => void;
  icon: typeof CreditCard; label: string; desc: string; detail: string; badge?: string;
}) {
  const active = modo === id;
  return (
    <button onClick={() => onSelect(id)}
      className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
        active ? "bg-blue-50 border-blue-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${active ? "text-blue-700" : "text-slate-400"}`}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${active ? "text-blue-900" : "text-slate-800"}`}>{label}</p>
          {badge && <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">{badge}</span>}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        {active && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{detail}</p>}
      </div>
    </button>
  );
}
