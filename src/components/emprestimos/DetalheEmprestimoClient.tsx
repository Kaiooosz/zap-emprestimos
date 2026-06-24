"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, DollarSign, CheckCircle, Banknote, Smartphone, Edit2 } from "lucide-react";
import { Parcela } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ModalPagamento } from "@/components/emprestimos/ModalPagamento";
import { ModalEditarPagamento } from "@/components/emprestimos/ModalEditarPagamento";
import { ModalEditarContrato } from "@/components/emprestimos/ModalEditarContrato";
import { formatarMoeda, formatarData, obterMeiaNoiteBR } from "@/lib/utils";

interface ParcelaData {
  id: string;
  numero: number;
  valorDevido: number;
  valorPrincipal: number;
  valorJuros: number;
  valorPago?: number | null;
  dataVencimento: string;
  dataPagamento?: string | null;
  status: string;
}

interface EmprestimoData {
  id: string;
  status: string;
  dataInicio: string;
  dataVencimento: string;
  taxaJuros: number;
  taxaAtraso: number;
  valorPrincipal: number;
  valorTotal: number;
  numParcelas: number;
  observacoes?: string | null;
  parcelas: ParcelaData[];
}

interface Props {
  emprestimo: EmprestimoData;
  parcelas: Parcela[];
  saldoDevedor: number;
  clientePhone: string;
  clienteNome: string;
  taxaJuros: number;
  dataInicio: string;
  regraAtraso: string;
  taxaAtraso: number;
  tipoTaxaAtraso: string;
}

function modoLabel(modo: string | null | undefined): string | null {
  if (!modo) return null;
  const map: Record<string, string> = {
    SOMENTE_JUROS:  "só juros",
    QUITACAO_TOTAL: "quitação",
    ANTECIPADO:     "antecipado",
    DETALHADO:      "detalhado",
    COMPLETO:       "",
    ABATIMENTO:     "parcial",
  };
  return map[modo] ?? null;
}

function iconMeio(tipo: string) {
  if (tipo === "PIX") return <Smartphone size={10} className="text-emerald-500" />;
  if (tipo === "CEDULA") return <Banknote size={10} className="text-yellow-500" />;
  return null;
}

export function DetalheEmprestimoClient({
  emprestimo, parcelas, saldoDevedor, clientePhone, clienteNome, taxaJuros, dataInicio, regraAtraso, taxaAtraso, tipoTaxaAtraso
}: Props) {
  const [modalParcela, setModalParcela] = useState<Parcela | null>(null);
  const [modalEditarParcela, setModalEditarParcela] = useState<Parcela | null>(null);
  const [showEditContrato, setShowEditContrato] = useState(false);
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
          regraAtraso={regraAtraso}
          taxaAtraso={taxaAtraso}
          tipoTaxaAtraso={tipoTaxaAtraso}
          clienteNome={clienteNome}
          clientePhone={clientePhone}
          onClose={() => setModalParcela(null)}
        />
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Parcelas</h2>
            <button
              onClick={() => setShowEditContrato(true)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-all cursor-pointer"
            >
              <Edit2 size={10} />
              Editar Contrato
            </button>
          </div>
          <span className="text-xs text-slate-500">
            Saldo: <span className="font-bold text-slate-900">{formatarMoeda(saldoDevedor)}</span>
          </span>
        </div>

        {/* ── Mobile: Cards ──────────────────────────────────────────────────── */}
        <div className="sm:hidden divide-y divide-slate-100">
          {parcelas.map((p) => {
            const pendente = ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status);
            const hoje = obterMeiaNoiteBR();
            const venc  = obterMeiaNoiteBR(p.dataVencimento);
            const diasAnte = Math.max(0, Math.floor((venc.getTime() - hoje.getTime()) / 86400000));
            const formas: any[] = JSON.parse((p as any).formasPagamento ?? "[]");
            const labelModo = modoLabel(p.modoPagamento);

            return (
              <div key={p.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-slate-100 inline-flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {p.numero}
                    </span>
                    <StatusBadge status={(p.status === "PAGO" ? "PAGO" : (venc.getTime() === hoje.getTime() ? "DIA_DE_PAGAR" : p.status)) as any} />
                    {labelModo && (
                      <span className="text-[10px] text-slate-400 font-medium">{labelModo}</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">{formatarMoeda(p.valorDevido)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <div>
                    <span>{formatarData(p.dataVencimento)}</span>
                    {pendente && diasAnte > 0 && (
                      <span className="ml-1.5 text-blue-600 font-medium">em {diasAnte}d</span>
                    )}
                    {p.dataPagamento && (
                      <span className="ml-1.5 text-emerald-600">pago {formatarData(p.dataPagamento)}</span>
                    )}
                  </div>
                  <div className="text-right text-[10px]">
                    <span className="text-slate-400">P: {formatarMoeda(p.valorPrincipal)} · J: {formatarMoeda(p.valorJuros)}</span>
                  </div>
                </div>

                {/* Meios de pagamento usados */}
                {formas.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-2">
                    {formas.map((f: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {iconMeio(f.tipo)}
                        {f.label ?? f.tipo} · {formatarMoeda(f.valor)}
                      </span>
                    ))}
                  </div>
                )}

                {pendente && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModalParcela(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all">
                      <DollarSign size={12} />
                      Dar Baixa
                    </button>
                    {clientePhone && (
                      <a href={`https://wa.me/${clientePhone.replace(/\D/g, "")}?text=${buildMsg(p)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-all">
                        <MessageCircle size={13} />
                      </a>
                    )}
                  </div>
                )}
                {!pendente && (
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => setModalEditarParcela(p)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-all">
                      Editar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Desktop: Tabela ─────────────────────────────────────────────────── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["#", "Vencimento", "Valor", "Principal", "Juros", "Como Pago", "Pago em", "Status", "Ações"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {parcelas.map((p) => {
                const pendente = ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status);
                const hoje = obterMeiaNoiteBR();
                const venc  = obterMeiaNoiteBR(p.dataVencimento);
                const diasAnte = Math.max(0, Math.floor((venc.getTime() - hoje.getTime()) / 86400000));
                const formas: any[] = JSON.parse((p as any).formasPagamento ?? "[]");
                const labelModo = modoLabel(p.modoPagamento);

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3">
                      <span className="h-6 w-6 rounded-full bg-slate-100 inline-flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {p.numero}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-slate-700">{formatarData(p.dataVencimento)}</p>
                      {pendente && diasAnte > 0 && (
                        <p className="text-[10px] text-blue-600 font-medium">em {diasAnte}d</p>
                      )}
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900 tabular-nums text-sm">{formatarMoeda(p.valorDevido)}</td>
                    <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">{formatarMoeda(p.valorPrincipal)}</td>
                    <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">{formatarMoeda(p.valorJuros)}</td>
                    <td className="px-3 py-3">
                      {formas.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {formas.map((f: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] text-slate-600">
                              {iconMeio(f.tipo)}
                              {f.label ?? f.tipo}
                              {formas.length > 1 && <span className="text-slate-400">· {formatarMoeda(f.valor)}</span>}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-slate-500">{p.dataPagamento ? formatarData(p.dataPagamento) : "—"}</p>
                      {labelModo && <p className="text-[10px] text-slate-400">{labelModo}</p>}
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={(p.status === "PAGO" ? "PAGO" : (venc.getTime() === hoje.getTime() ? "DIA_DE_PAGAR" : p.status)) as any}/></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {pendente && (
                          <button onClick={() => setModalParcela(p)}
                            title="Dar baixa / registrar pagamento"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all whitespace-nowrap">
                            <DollarSign size={10}/>
                            Baixa
                          </button>
                        )}
                        {pendente && clientePhone && (
                          <a href={`https://wa.me/${clientePhone.replace(/\D/g, "")}?text=${buildMsg(p)}`}
                            target="_blank" rel="noopener noreferrer"
                            title="Cobrar via WhatsApp"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-all">
                            <MessageCircle size={11}/>
                          </a>
                        )}
                        {!pendente && (
                          <button onClick={() => setModalEditarParcela(p)}
                            title="Editar pagamento"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-all whitespace-nowrap">
                            Editar
                          </button>
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

      {modalEditarParcela && (
        <ModalEditarPagamento
          parcela={modalEditarParcela}
          onClose={() => setModalEditarParcela(null)}
        />
      )}

      {showEditContrato && (
        <ModalEditarContrato
          emprestimo={emprestimo}
          onClose={() => setShowEditContrato(false)}
        />
      )}
    </>
  );
}
