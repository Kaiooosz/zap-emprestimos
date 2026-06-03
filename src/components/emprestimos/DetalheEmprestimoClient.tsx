"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, CheckCircle } from "lucide-react";
import { Parcela } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ModalPagamento } from "@/components/emprestimos/ModalPagamento";
import { formatarMoeda, formatarData } from "@/lib/utils";

interface Props {
  parcelas: Parcela[];
  saldoDevedor: number;
  clientePhone: string;
  clienteNome: string;
}

export function DetalheEmprestimoClient({ parcelas, saldoDevedor, clientePhone, clienteNome }: Props) {
  const [modalParcela, setModalParcela] = useState<Parcela | null>(null);
  const router = useRouter();

  function buildWhatsAppMsg(p: Parcela) {
    const diasAtraso = p.status === "ATRASADO"
      ? Math.floor((Date.now() - new Date(p.dataVencimento).getTime()) / 86400000)
      : 0;
    const msg = p.status === "ATRASADO"
      ? `Olá *${clienteNome}*!\n\nSua parcela *${p.numero}* de *${formatarMoeda(p.valorDevido)}* está em atraso há *${diasAtraso} dias*.\n\nPor favor regularize o quanto antes para não comprometer seu score.\n\n_Zap Empréstimos_`
      : `Olá *${clienteNome}*!\n\nSua parcela *${p.numero}* de *${formatarMoeda(p.valorDevido)}* vence em *${formatarData(p.dataVencimento)}*.\n\nEvite atrasos para manter seu score em dia!\n\n_Zap Empréstimos_`;
    return encodeURIComponent(msg);
  }

  return (
    <>
      {modalParcela && (
        <ModalPagamento
          parcela={modalParcela}
          saldoDevedor={saldoDevedor}
          onClose={() => setModalParcela(null)}
        />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Parcelas</h2>
          <span className="text-xs text-slate-500">Saldo devedor: <span className="text-slate-300 font-semibold">{formatarMoeda(saldoDevedor)}</span></span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {["#", "Vencimento", "Valor", "Principal", "Juros", "Pago em", "Status", "Ações"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#152035]/50">
            {parcelas.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3.5">
                  <span className="h-6 w-6 rounded-full bg-slate-100 inline-flex items-center justify-center text-xs font-bold text-slate-300">
                    {p.numero}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-400">{formatarData(p.dataVencimento)}</td>
                <td className="px-4 py-3.5 font-semibold text-white">{formatarMoeda(p.valorDevido)}</td>
                <td className="px-4 py-3.5 text-xs text-slate-500">{formatarMoeda(p.valorPrincipal)}</td>
                <td className="px-4 py-3.5 text-xs text-slate-500">{formatarMoeda(p.valorJuros)}</td>
                <td className="px-4 py-3.5 text-xs text-slate-500">
                  {p.dataPagamento ? formatarData(p.dataPagamento) : "—"}
                  {p.modoPagamento === "SOMENTE_JUROS" && <span className="ml-1 text-amber-500">(só juros)</span>}
                  {p.modoPagamento === "QUITACAO_TOTAL" && <span className="ml-1 text-emerald-500">(quitação)</span>}
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status) && (
                      <button
                        onClick={() => setModalParcela(p)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                      >
                        <CheckCircle size={11} />
                        Dar Baixa
                      </button>
                    )}
                    {["PENDENTE", "ATRASADO"].includes(p.status) && clientePhone && (
                      <a
                        href={`https://wa.me/${clientePhone.replace(/\D/g, "")}?text=${buildWhatsAppMsg(p)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Cobrar via WhatsApp"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-emerald-600 hover:border-emerald-700 hover:text-emerald-400 transition-all"
                      >
                        <MessageCircle size={12} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
