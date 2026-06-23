"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  X, CreditCard, Zap, CheckCircle2, Clock, Download, MessageCircle,
  User, Plus, Trash2, Banknote, Smartphone, MoreHorizontal
} from "lucide-react";
import { Parcela } from "@/lib/store";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { calcularPagamentoAntecipado, calcularJurosAtraso } from "@/lib/calculo/juros";
import { gerarComprovantePDF } from "@/lib/comprovante/gerarPDF";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  parcela: Parcela;
  saldoDevedor: number;
  taxaJuros: number;
  dataInicioPeriodo: string;
  regraAtraso: string;
  taxaAtraso: number;
  tipoTaxaAtraso: string;
  clienteNome: string;
  clientePhone: string;
  onClose: () => void;
}

type Modo = "COMPLETO" | "SOMENTE_JUROS" | "ANTECIPADO" | "QUITACAO_TOTAL";

export type TipoMeioPagamento = "PIX" | "CEDULA" | "TRANSFERENCIA" | "CHEQUE" | "OUTRO";

export interface MeioPagamento {
  tipo: TipoMeioPagamento;
  descricao?: string; // para OUTRO
  valor: string;      // string para input controlado
}

const MEIOS_CONFIG: Record<TipoMeioPagamento, { label: string; icon: typeof CreditCard; cor: string }> = {
  PIX:          { label: "Pix",           icon: Smartphone,     cor: "text-emerald-600" },
  CEDULA:       { label: "Cédula (Esp.)", icon: Banknote,       cor: "text-yellow-600"  },
  TRANSFERENCIA:{ label: "Transferência", icon: CreditCard,     cor: "text-blue-600"    },
  CHEQUE:       { label: "Cheque",        icon: MoreHorizontal, cor: "text-slate-600"   },
  OUTRO:        { label: "Outro",         icon: MoreHorizontal, cor: "text-slate-500"   },
};

// ── Componente Principal ─────────────────────────────────────────────────────

export function ModalPagamento({
  parcela, saldoDevedor, taxaJuros, dataInicioPeriodo, regraAtraso, taxaAtraso, tipoTaxaAtraso,
  clienteNome, clientePhone, onClose
}: Props) {
  const [modo, setModo]                 = useState<Modo>("COMPLETO");
  const [desconto, setDesconto]         = useState(0);
  const [loading, setLoading]           = useState(false);
  const [cobrarJuros, setCobrarJuros]   = useState(true);
  const [destinoAbatimento, setDestinoAbatimento] = useState<"PRINCIPAL" | "JUROS">("PRINCIPAL");
  const [valorDigitado, setValorDigitado] = useState<string>("");
  const [sucesso, setSucesso]           = useState(false);
  const [retornoAPI, setRetornoAPI]     = useState<any>(null);
  const router = useRouter();

  // Baixa detalhada
  const [detalhado, setDetalhado]       = useState(false);
  const [vPrincipalPago, setVPrincipalPago] = useState<string>("");
  const [vJurosPago, setVJurosPago]         = useState<string>("");
  const [vJurosAtrasoPago, setVJurosAtrasoPago] = useState<string>("");

  // Meios de pagamento
  const [meios, setMeios] = useState<MeioPagamento[]>([
    { tipo: "PIX", valor: "" }
  ]);

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

  const jurosCalculados = atraso && cobrarJuros ? atraso.valorAtualizado - parcela.valorDevido : 0;
  const valorQuitacao = Math.round(saldoDevedor * (1 - desconto / 100) * 100) / 100;
  const valorFinal =
    modo === "SOMENTE_JUROS"  ? parcela.valorJuros :
    modo === "ANTECIPADO"     ? (antecipado?.valorComDesconto ?? parcela.valorDevido) :
    modo === "QUITACAO_TOTAL" ? valorQuitacao :
    atraso                    ? (parcela.valorDevido + jurosCalculados) : parcela.valorDevido;

  const [prevValorFinal, setPrevValorFinal] = useState(valorFinal);
  if (valorFinal !== prevValorFinal) {
    setPrevValorFinal(valorFinal);
    setValorDigitado(String(valorFinal));
    // atualiza o primeiro meio com o valor total
    setMeios(prev => prev.length > 0 ? [{ ...prev[0], valor: String(valorFinal) }, ...prev.slice(1)] : prev);
  }

  const totalDetPago = useMemo(() => {
    if (!detalhado) return 0;
    return Number(vPrincipalPago || 0) + Number(vJurosPago || 0) + Number(vJurosAtrasoPago || 0);
  }, [detalhado, vPrincipalPago, vJurosPago, vJurosAtrasoPago]);

  // Total declarado nos meios de pagamento
  const totalMeios = useMemo(() =>
    meios.reduce((s, m) => s + (Number(m.valor) || 0), 0),
    [meios]
  );

  const isParcial = Number(valorDigitado) < valorFinal;

  const ativarDetalhado = (checked: boolean) => {
    setDetalhado(checked);
    if (checked) {
      setVPrincipalPago(String(parcela.valorPrincipal));
      setVJurosPago(String(parcela.valorJuros));
      setVJurosAtrasoPago(String(jurosCalculados > 0 ? jurosCalculados : 0));
    }
  };

  // ── Meios helpers ─────────────────────────────────────────────────────────

  function addMeio() {
    setMeios(prev => [...prev, { tipo: "CEDULA", valor: "" }]);
  }

  function removeMeio(idx: number) {
    setMeios(prev => prev.filter((_, i) => i !== idx));
  }

  function updateMeio(idx: number, field: keyof MeioPagamento, value: string) {
    setMeios(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }

  function distribuirValor() {
    // distribui o valor final igualmente entre os meios
    const valorPorMeio = (detalhado ? totalDetPago : Number(valorDigitado) || valorFinal) / meios.length;
    setMeios(prev => prev.map(m => ({ ...m, valor: valorPorMeio.toFixed(2) })));
  }

  // ── Confirmar pagamento ───────────────────────────────────────────────────

  async function confirmar() {
    setLoading(true);
    try {
      const formasPagamento = meios
        .filter(m => Number(m.valor) > 0)
        .map(m => ({ tipo: m.tipo, descricao: m.descricao, valor: Number(m.valor) }));

      const payload = detalhado ? {
        modo: "DETALHADO",
        valorPago: totalDetPago,
        valorPrincipalPago: Number(vPrincipalPago),
        valorJurosPago: Number(vJurosPago),
        valorJurosAtrasoPago: Number(vJurosAtrasoPago),
        cobrarJurosAtraso: cobrarJuros,
        formasPagamento,
      } : {
        modo,
        valorPago: Number(valorDigitado),
        descontoAntecipado: modo === "ANTECIPADO" ? antecipado?.descontoJuros : undefined,
        diasAntecipados: modo === "ANTECIPADO" ? antecipado?.diasAntecipados : undefined,
        cobrarJurosAtraso: cobrarJuros,
        destinoAbatimento: Number(valorDigitado) < valorFinal ? destinoAbatimento : "NENHUM",
        formasPagamento,
      };

      const res = await fetch(`/api/parcelas/${parcela.id}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setRetornoAPI(data);
        setSucesso(true);
      } else {
        alert("Erro ao registrar pagamento.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao registrar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  // ── Tela de Sucesso ───────────────────────────────────────────────────────

  if (sucesso) {
    const idTransferencia = retornoAPI?.idTransferencia ?? `TXN-${parcela.id.slice(-8).toUpperCase()}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}`;
    const operadorNome = retornoAPI?.operadorNome ?? "Equipe";
    const saldoRestante = detalhado
      ? Math.max(0, (Number(parcela.valorPrincipal) - Number(vPrincipalPago)) + (Number(parcela.valorJuros) - Number(vJurosPago)))
      : Math.max(0, valorFinal - Number(valorDigitado));
    const valorPagoFinal = detalhado ? totalDetPago : Number(valorDigitado);
    const formasFinal = meios.filter(m => Number(m.valor) > 0);

    const whatsMsg = () => {
      const dataFormatada = (retornoAPI?.dataPagamento ? new Date(retornoAPI.dataPagamento) : new Date()).toLocaleString('pt-BR');
      
      let msg = `📄 *RECIBO DIGITAL DE PAGAMENTO* 📄\n`;
      msg += `===============================\n\n`;
      msg += `Olá, *${clienteNome}*!\n`;
      msg += `Confirmamos o recebimento do seu pagamento.\n\n`;
      msg += `🔹 *Detalhes da Operação*\n`;
      msg += `*Data/Hora:* ${dataFormatada}\n`;
      msg += `*Contrato ID:* ${parcela.emprestimoId.slice(0,8).toUpperCase()}\n`;
      msg += `*Parcela:* Nº ${parcela.numero}\n`;
      msg += `*Valor Recebido:* ${formatarMoeda(valorPagoFinal)}\n\n`;

      if (detalhado) {
        msg += `📊 *Composição do Valor*\n`;
        msg += `Capital: ${formatarMoeda(Number(vPrincipalPago))}\n`;
        msg += `Juros: ${formatarMoeda(Number(vJurosPago))}\n`;
        if (Number(vJurosAtrasoPago) > 0) {
          msg += `Atraso: ${formatarMoeda(Number(vJurosAtrasoPago))}\n`;
        }
        msg += `\n`;
      } else {
        msg += `📊 *Status da Parcela*\n`;
        if (isParcial) {
          msg += `Situação: Pagamento Parcial (${destinoAbatimento === "PRINCIPAL" ? "Abatimento no Capital" : "Abatimento nos Juros"})\n`;
          msg += `Saldo Restante: *${formatarMoeda(saldoRestante)}*\n`;
        } else {
          msg += `Situação: *Quitada* ✅\n`;
        }
        msg += `\n`;
      }

      msg += `💳 *Meio(s) de Pagamento*\n`;
      formasFinal.forEach(f => {
         const cfg = MEIOS_CONFIG[f.tipo];
         msg += `${cfg.label}${f.descricao ? ' ('+f.descricao+')' : ''}: ${formatarMoeda(Number(f.valor))}\n`;
      });
      msg += `\n`;

      msg += `===============================\n`;
      msg += `*ID da Transação:* \`${idTransferencia}\`\n`;
      msg += `*Operador:* ${operadorNome || 'Equipe'}\n\n`;
      msg += `A equipe Zap Empréstimos agradece a sua preferência! Qualquer dúvida, estamos à disposição.`;
      return msg;
    };

    const baixarPDF = () => {
      gerarComprovantePDF({
        idTransferencia,
        dataPagamento: retornoAPI?.dataPagamento ?? new Date().toISOString(),
        clienteNome,
        clientePhone,
        parcelaNumero: parcela.numero,
        emprestimoId: parcela.emprestimoId,
        valorTotal: valorPagoFinal,
        valorPrincipal: detalhado ? Number(vPrincipalPago) : undefined,
        valorJuros: detalhado ? Number(vJurosPago) : undefined,
        valorJurosAtraso: detalhado ? Number(vJurosAtrasoPago) : jurosCalculados > 0 ? jurosCalculados : undefined,
        saldoRestante,
        modo: detalhado ? "DETALHADO" : modo,
        isParcial,
        destinoAbatimento: isParcial ? destinoAbatimento : undefined,
        diasAtraso: atraso?.diasAtraso,
        operadorNome,
        formasPagamento: formasFinal.map(f => ({
          tipo: f.tipo,
          descricao: f.descricao,
          valor: Number(f.valor),
          label: MEIOS_CONFIG[f.tipo]?.label ?? f.tipo,
        })),
      });
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-normal">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { onClose(); router.refresh(); }} />
        <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <h2 className="text-sm font-bold text-slate-900">Pagamento Registrado</h2>
            <button onClick={() => { onClose(); router.refresh(); }} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
          </div>

          <div className="p-5 space-y-4">
            {/* Banner sucesso */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 text-emerald-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold">Baixa realizada com sucesso!</p>
                <p className="text-[11px] mt-0.5 text-emerald-700">O pagamento foi contabilizado no sistema.</p>
              </div>
            </div>

            {/* ID de Transferência */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID de Transferência</p>
                <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">{idTransferencia}</p>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-lg font-semibold">Lançamento #{parcela.numero}</span>
            </div>

            {/* Confirmado por */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Confirmado por</p>
                <p className="text-sm font-bold text-blue-900">{operadorNome}</p>
              </div>
              <span className="ml-auto text-[10px] text-blue-500">Equipe</span>
            </div>

            {/* Forma(s) de pagamento */}
            {formasFinal.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Como foi pago</p>
                {formasFinal.map((f, i) => {
                  const cfg = MEIOS_CONFIG[f.tipo];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon size={13} className={cfg.cor} />
                        <span className="text-xs font-semibold text-slate-700">{cfg.label}{f.descricao ? ` — ${f.descricao}` : ""}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">{formatarMoeda(Number(f.valor))}</span>
                    </div>
                  );
                })}
                {formasFinal.length > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400">Total declarado</span>
                    <span className="text-xs font-bold text-slate-900">{formatarMoeda(formasFinal.reduce((s, f) => s + Number(f.valor), 0))}</span>
                  </div>
                )}
              </div>
            )}

            {/* Detalhamento financeiro */}
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-500">Cliente</span>
                <span className="font-semibold text-slate-900">{clienteNome}</span>
              </div>
              {detalhado ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Principal (Capital) Pago</span>
                    <span className="font-semibold">{formatarMoeda(Number(vPrincipalPago))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Juros da Parcela Pago</span>
                    <span className="font-semibold">{formatarMoeda(Number(vJurosPago))}</span>
                  </div>
                  {Number(vJurosAtrasoPago) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Juros de Atraso Pago</span>
                      <span className="font-semibold text-red-600">{formatarMoeda(Number(vJurosAtrasoPago))}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valor Recebido</span>
                    <span className="font-semibold">{formatarMoeda(Number(valorDigitado))}</span>
                  </div>
                  {jurosCalculados > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Incl. Juros de Atraso</span>
                      <span className="font-semibold text-red-600">{formatarMoeda(jurosCalculados)}</span>
                    </div>
                  )}
                  {isParcial && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Abatido do</span>
                      <span className="font-semibold text-blue-700">{destinoAbatimento === "PRINCIPAL" ? "Capital" : "Juros"}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-900">Total Pago</span>
                <span className="font-bold text-slate-900 text-sm">{formatarMoeda(valorPagoFinal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Saldo Restante</span>
                <span className={`font-bold ${saldoRestante <= 0 ? "text-emerald-600" : "text-slate-900"}`}>
                  {saldoRestante <= 0 ? "QUITADO ✓" : formatarMoeda(saldoRestante)}
                </span>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col gap-2">
              <button
                onClick={baixarPDF}
                className="w-full rounded-xl bg-slate-900 py-3 text-center text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Baixar Comprovante PDF
              </button>
              <a
                href={`https://api.whatsapp.com/send?phone=${clientePhone.replace(/\D/g, "")}&text=${encodeURIComponent(whatsMsg())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={14} className="text-green-600" />
                Enviar Comprovante via WhatsApp
              </a>
              <button
                onClick={() => { onClose(); router.refresh(); }}
                className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 text-center text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Tela de formulário ────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
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
        {atraso && atraso.diasAtraso > 0 && !detalhado && (
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
          {/* Toggle baixa detalhada */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-bold text-slate-700">Discriminar Valores (Baixa Manual)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Digitar valores de Principal e Juros separadamente</p>
            </div>
            <input
              type="checkbox"
              checked={detalhado}
              onChange={(e) => ativarDetalhado(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {!detalhado ? (
            <>
              <OpcaoPagamento id="COMPLETO" modo={modo} onSelect={setModo}
                icon={CreditCard} label="Pagar Parcela Completa"
                desc={`${formatarMoeda(atraso ? atraso.valorAtualizado : parcela.valorDevido)}`}
                detail={`Principal: ${formatarMoeda(parcela.valorPrincipal)} · Juros: ${formatarMoeda(parcela.valorJuros)}`}
              />
              {podeAntecipar && antecipado && (
                <OpcaoPagamento id="ANTECIPADO" modo={modo} onSelect={setModo}
                  icon={Clock} label="Pagamento Antecipado"
                  desc={`Pro-rata — ${formatarMoeda(antecipado.valorComDesconto)}`}
                  detail={`${antecipado.diasUsados} dias usados · Desconto: ${formatarMoeda(antecipado.descontoJuros)} (${antecipado.percentualDesconto}%)`}
                  badge="Desconto"
                />
              )}
              <OpcaoPagamento id="SOMENTE_JUROS" modo={modo} onSelect={setModo}
                icon={Zap} label="Pagar Só os Juros"
                desc={`Adia principal — ${formatarMoeda(parcela.valorJuros)}`}
                detail={`Principal de ${formatarMoeda(parcela.valorPrincipal)} vai para a próxima parcela`}
              />
              <OpcaoPagamento id="QUITACAO_TOTAL" modo={modo} onSelect={setModo}
                icon={CheckCircle2} label="Quitar Tudo de Uma Vez"
                desc={`Saldo: ${formatarMoeda(saldoDevedor)}`}
                detail="Liquida todas as parcelas pendentes do contrato"
              />
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
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
              <p className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">Valores Individuais Recebidos</p>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Principal (Capital) Pago</label>
                <input type="number" step="0.01" min="0"
                  value={vPrincipalPago} onChange={(e) => setVPrincipalPago(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Juros da Parcela Pago</label>
                <input type="number" step="0.01" min="0"
                  value={vJurosPago} onChange={(e) => setVJurosPago(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors font-bold"
                />
              </div>
              {atraso && atraso.diasAtraso > 0 && cobrarJuros && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Juros de Atraso Pago (Calculado: {formatarMoeda(jurosCalculados)})</label>
                  <input type="number" step="0.01" min="0"
                    value={vJurosAtrasoPago} onChange={(e) => setVJurosAtrasoPago(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors font-bold text-red-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Cobrar juros / Valor digitado ─────────────────────────────────── */}
        <div className="px-5 space-y-4">
          {!detalhado && (
            <>
              {atraso && atraso.diasAtraso > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Cobrar juros de atraso</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {atraso.diasAtraso} dias de atraso ({tipoTaxaAtraso === "VALOR" ? `R$ ${taxaAtraso}` : `${taxaAtraso}%`}/dia)
                    </p>
                  </div>
                  <input type="checkbox" checked={cobrarJuros} onChange={(e) => setCobrarJuros(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Pago de Fato (R$)</label>
                <input type="number" step="0.01" min="0.01"
                  value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors font-bold"
                />
              </div>
              {Number(valorDigitado) < valorFinal && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-blue-800">Pagamento Parcial Identificado</p>
                    <p className="text-[10px] text-blue-600 mt-0.5">Descontar o valor pago de qual saldo?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setDestinoAbatimento("PRINCIPAL")}
                      className={`rounded-lg py-2 text-xs font-semibold border transition-all cursor-pointer ${destinoAbatimento === "PRINCIPAL" ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"}`}>
                      Capital (Principal)
                    </button>
                    <button type="button" onClick={() => setDestinoAbatimento("JUROS")}
                      className={`rounded-lg py-2 text-xs font-semibold border transition-all cursor-pointer ${destinoAbatimento === "JUROS" ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"}`}>
                      Juros da Parcela
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Seção: Como foi pago ──────────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-700">Como foi pago?</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Pix, cédula, ou múltiplos meios</p>
              </div>
              {meios.length > 1 && (
                <button onClick={distribuirValor} className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer">
                  Distribuir igualmente
                </button>
              )}
            </div>

            <div className="space-y-2">
              {meios.map((meio, idx) => {
                const cfg = MEIOS_CONFIG[meio.tipo];
                const Icon = cfg.icon;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    {/* Seletor de tipo */}
                    <div className="relative flex-1">
                      <select
                        value={meio.tipo}
                        onChange={(e) => updateMeio(idx, "tipo", e.target.value as TipoMeioPagamento)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 cursor-pointer"
                      >
                        {(Object.keys(MEIOS_CONFIG) as TipoMeioPagamento[]).map(t => (
                          <option key={t} value={t}>{MEIOS_CONFIG[t].label}</option>
                        ))}
                      </select>
                      <Icon size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${cfg.cor} pointer-events-none`} />
                    </div>

                    {/* Descrição (para OUTRO) */}
                    {meio.tipo === "OUTRO" && (
                      <input
                        type="text"
                        placeholder="Descreva..."
                        value={meio.descricao ?? ""}
                        onChange={(e) => updateMeio(idx, "descricao", e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                      />
                    )}

                    {/* Valor */}
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={meio.valor}
                        onChange={(e) => updateMeio(idx, "valor", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-2 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400 text-right"
                      />
                    </div>

                    {/* Remover */}
                    {meios.length > 1 && (
                      <button onClick={() => removeMeio(idx)} className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Adicionar meio */}
            <button onClick={addMeio}
              className="w-full rounded-xl border border-dashed border-slate-200 py-2 text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
              <Plus size={13} />
              Adicionar outro meio de pagamento
            </button>

            {/* Alerta se soma dos meios ≠ valor pago */}
            {meios.length > 1 && totalMeios > 0 && (
              <div className={`rounded-lg px-3 py-2 flex items-center justify-between text-xs ${
                Math.abs(totalMeios - (detalhado ? totalDetPago : Number(valorDigitado) || valorFinal)) < 0.02
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border border-amber-200 text-amber-700"
              }`}>
                <span className="font-medium">Total declarado nos meios</span>
                <span className="font-bold">{formatarMoeda(totalMeios)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="px-5 pb-5 pt-3 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <div>
              <p className="text-xs text-slate-500">{detalhado ? "Total Pago Discriminado" : "Total Devido Esperado"}</p>
              {modo === "ANTECIPADO" && antecipado && !detalhado && (
                <p className="text-xs text-blue-600 font-medium mt-0.5">
                  Economia de {formatarMoeda(antecipado.descontoJuros)} ({antecipado.percentualDesconto}%)
                </p>
              )}
            </div>
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {formatarMoeda(detalhado ? totalDetPago : valorFinal)}
            </span>
          </div>
          <button onClick={confirmar} disabled={loading}
            className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors cursor-pointer">
            {loading ? "Registrando..." : "Confirmar Pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OpcaoPagamento ────────────────────────────────────────────────────────────

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
