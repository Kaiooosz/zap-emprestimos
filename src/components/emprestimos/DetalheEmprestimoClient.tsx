"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, CheckCircle, DollarSign } from "lucide-react";
import { Parcela } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ModalPagamento } from "@/components/emprestimos/ModalPagamento";
import { formatarMoeda, formatarData } from "@/lib/utils";

interface Props {
  parcelas: Parcela[];
  saldoDevedor: number;
  clientePhone: string;
  clienteNome: string;
  taxaJuros: number;
  dataInicio: string;
}

export function DetalheEmprestimoClient({
  parcelas, saldoDevedor, clientePhone, clienteNome, taxaJuros, dataInicio
}: Props) {
  const [modalParcela, setModalParcela] = useState<Parcela | null>(null);
  const router = useRouter();

  function buildMsg(p: Parcela) {
    const diasAtraso = p.status === "ATRASADO"
      ? Math.floor((Date.now() - new Date(p.dataVencimento).getTime()) / 86400000)
      : 0;
    const hoje = new Date();
    const venc  = new Date(p.dataVencimento);
    const diasAte = Math.max(0, Math.floor((venc.getTime() - hoje.getTime()) / 86400000));

    const msg = p.status === "ATRASADO"
      ? `Olá *${clienteNome}*!\n\nSua parcela *${p.numero}* de *${formatarMoeda(p.valorDevido)}* está em atraso há *${diasAtraso} dias*.\n\nPor favor regularize para não comprometer seu score.\n\n_Zap Empréstimos_`
      : `Olá *${clienteNome}*!\n\nSua parcela *${p.numero}* de *${formatarMoeda(p.valorDevido)}* vence em *${formatarData(p.dataVencimento)}* (${diasAte === 0 ? "hoje" : `em ${diasAte} dias`}).\n\nEvite atrasos!\n\n_Zap Empréstimos_`;
    return encodeURIComponent(msg);
  }

  // Calcula dataInicioPeriodo de cada parcela
  function getInicioPeriodo(p: Parcela): string {
    const idx = parcelas.findIndex((pp) => pp.id === p.id);
    if (idx === 0) return dataInicio;
    const prev = parcelas[idx - 1];
    return prev.dataVencimento;
  }

  return (
    <>
      {modalParcela && (
        <ModalPagamento
          parcela={modalParcela}
          saldoDevedor={saldoDevedor}
          taxaJuros={taxaJuros}
          dataInicioPeriodo={getInicioPeriodo(modalParcela)}
          onClose={() => setModalParcela(null)}
        />
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Parcelas</h2>
          <span className="text-xs text-slate-500">
            Saldo devedor: <span className="font-bold text-slate-900">{formatarMoeda(saldoDevedor)}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["#","Vencimento","Valor","Principal","Juros","Pago em","Status","Acoes"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {parcelas.map((p) => {
                const pendente = ["PENDENTE","ATRASADO","PARCIAL"].includes(p.status);
                const hoje = new Date();
                const venc  = new Date(p.dataVencimento);
                const diasAnte = Math.max(0, Math.floor((venc.getTime() - hoje.getTime()) / 86400000));

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="h-6 w-6 rounded-full bg-slate-100 inline-flex items-center justify-center text-xs font-bold text-slate-600">
                        {p.numero}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-slate-700">{formatarData(p.dataVencimento)}</p>
                      {pendente && diasAnte > 0 && (
                        <p className="text-xs text-blue-600 font-medium">em {diasAnte}d</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 tabular-nums">{formatarMoeda(p.valorDevido)}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">{formatarMoeda(p.valorPrincipal)}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">{formatarMoeda(p.valorJuros)}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-slate-500">{p.dataPagamento ? formatarData(p.dataPagamento) : "—"}</p>
                      {p.modoPagamento === "SOMENTE_JUROS"  && <p className="text-xs text-amber-600 font-medium">so juros</p>}
                      {p.modoPagamento === "QUITACAO_TOTAL" && <p className="text-xs text-slate-600 font-medium">quitacao</p>}
                      {p.modoPagamento === "ANTECIPADO"     && <p className="text-xs text-blue-600 font-medium">antecipado</p>}
                      {(p as any).descontoAntecipado > 0    && (
                        <p className="text-xs text-blue-500">-{formatarMoeda((p as any).descontoAntecipado)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={p.status}/></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {pendente && (
                          <button
                            onClick={() => setModalParcela(p)}
                            title="Dar baixa / registrar pagamento"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
                          >
                            <DollarSign size={11}/>
                            Dar Baixa
                          </button>
                        )}
                        {pendente && clientePhone && (
                          <a
                            href={`https://wa.me/${clientePhone.replace(/\D/g,"")}?text=${buildMsg(p)}`}
                            target="_blank" rel="noopener noreferrer"
                            title="Cobrar via WhatsApp"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-all"
                          >
                            <MessageCircle size={12}/>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
