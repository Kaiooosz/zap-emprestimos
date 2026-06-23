"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Save, Calendar, Percent, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { formatarMoeda } from "@/lib/utils";

interface ParcelaData {
  id: string;
  numero: number;
  valorDevido: number;
  dataVencimento: string;
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

interface ModalEditarContratoProps {
  emprestimo: EmprestimoData;
  onClose: () => void;
}

export function ModalEditarContrato({ emprestimo, onClose }: ModalEditarContratoProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Estados dos campos básicos
  const [status, setStatus] = useState(emprestimo.status);
  const [dataInicio, setDataInicio] = useState(emprestimo.dataInicio.split("T")[0]);
  const [dataVencimento, setDataVencimento] = useState(emprestimo.dataVencimento.split("T")[0]);
  const [taxaJuros, setTaxaJuros] = useState(emprestimo.taxaJuros);
  const [taxaAtraso, setTaxaAtraso] = useState(emprestimo.taxaAtraso);
  const [valorPrincipal, setValorPrincipal] = useState(emprestimo.valorPrincipal);
  const [observacoes, setObservacoes] = useState(emprestimo.observacoes ?? "");

  // Estado das parcelas
  const [parcelas, setParcelas] = useState<ParcelaData[]>(
    emprestimo.parcelas.map(p => ({
      ...p,
      dataVencimento: p.dataVencimento.split("T")[0]
    }))
  );

  const handleParcelaDateChange = (id: string, date: string) => {
    setParcelas(prev => prev.map(p => p.id === id ? { ...p, dataVencimento: date } : p));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emprestimos/${emprestimo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          dataInicio,
          dataVencimento,
          taxaJuros,
          taxaAtraso,
          valorPrincipal,
          observacoes,
          parcelas: parcelas.map(p => ({
            id: p.id,
            dataVencimento: p.dataVencimento
          }))
        })
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar dados do contrato.");
      }

      router.refresh();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Houve um erro ao atualizar o contrato.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="flex h-full max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Editar Contrato</h3>
            <p className="text-xs text-slate-400 mt-0.5">Modifique as datas, valores e vencimentos do contrato</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informações Gerais</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Status do Contrato</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="QUITADO">Quitado</option>
                  <option value="INADIMPLENTE">Inadimplente</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Valor Principal</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">R$</span>
                  <input
                    type="number"
                    step="any"
                    value={valorPrincipal}
                    onChange={(e) => setValorPrincipal(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Data de Início</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Vencimento Geral (Fim)</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Taxa de Juros (%)</label>
                <div className="relative">
                  <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="any"
                    value={taxaJuros}
                    onChange={(e) => setTaxaJuros(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mora Diária / Atraso (%)</label>
                <div className="relative">
                  <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="any"
                    value={taxaAtraso}
                    onChange={(e) => setTaxaAtraso(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Observações</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Observações ou notas do contrato"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500 resize-none"
              />
            </div>
          </div>

          {/* Vencimento de Parcelas */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vencimento das Parcelas</h4>
              <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">{parcelas.length} parcelas</span>
            </div>

            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-slate-50/30">
              {parcelas.map((p) => {
                const isPaga = p.status === "PAGO";
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-white">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="h-5 w-5 rounded-full bg-slate-100 inline-flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                          {p.numero}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{formatarMoeda(p.valorDevido)}</span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isPaga ? "bg-emerald-50 text-emerald-700" : p.status === "ATRASADO" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="w-40 shrink-0">
                      <input
                        type="date"
                        value={p.dataVencimento}
                        disabled={isPaga}
                        onChange={(e) => handleParcelaDateChange(p.id, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-4 gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Alterações
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
