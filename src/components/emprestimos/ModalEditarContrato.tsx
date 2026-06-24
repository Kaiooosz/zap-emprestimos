"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Save, Calendar, Percent, DollarSign, AlertCircle, Loader2, Trash2, Plus } from "lucide-react";
import { formatarMoeda } from "@/lib/utils";

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

  // Estado de parcelas deletadas
  const [deletedParcelaIds, setDeletedParcelaIds] = useState<string[]>([]);

  // Estado das parcelas
  const [parcelas, setParcelas] = useState<ParcelaData[]>(
    emprestimo.parcelas.map(p => ({
      ...p,
      dataVencimento: p.dataVencimento.split("T")[0],
      dataPagamento: p.dataPagamento ? p.dataPagamento.split("T")[0] : null,
      valorPrincipal: Number(p.valorPrincipal ?? 0),
      valorJuros: Number(p.valorJuros ?? 0),
      valorPago: p.valorPago !== null && p.valorPago !== undefined ? Number(p.valorPago) : null,
    }))
  );

  const updateParcela = (id: string, index: number, field: keyof ParcelaData, value: any) => {
    setParcelas(prev => prev.map((p, i) => {
      if ((p.id && p.id === id) || (!p.id && i === index)) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const removeParcela = (id: string | undefined, index: number) => {
    if (id) {
      setDeletedParcelaIds(prev => [...prev, id]);
    }
    setParcelas(prev => prev.filter((_, i) => i !== index));
  };

  const addParcela = () => {
    const proximoNumero = parcelas.length > 0 ? Math.max(...parcelas.map(p => p.numero)) + 1 : 1;
    let proxVenc = new Date().toISOString().split("T")[0];
    if (parcelas.length > 0) {
      const ultimoVenc = new Date(parcelas[parcelas.length - 1].dataVencimento);
      ultimoVenc.setDate(ultimoVenc.getDate() + 30);
      proxVenc = ultimoVenc.toISOString().split("T")[0];
    }

    setParcelas(prev => [
      ...prev,
      {
        id: "",
        numero: proximoNumero,
        valorDevido: Number(valorPrincipal) / (emprestimo.numParcelas || 1),
        valorPrincipal: Number(valorPrincipal) / (emprestimo.numParcelas || 1),
        valorJuros: (Number(valorPrincipal) * Number(taxaJuros) / 100) / (emprestimo.numParcelas || 1),
        valorPago: null,
        dataVencimento: proxVenc,
        dataPagamento: null,
        status: "PENDENTE",
      }
    ]);
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
            id: p.id || undefined,
            numero: p.numero,
            valorDevido: Number(p.valorPrincipal) + Number(p.valorJuros),
            valorPrincipal: Number(p.valorPrincipal),
            valorJuros: Number(p.valorJuros),
            valorPago: ["PAGO", "PARCIAL"].includes(p.status) ? Number(p.valorPago || 0) : null,
            dataVencimento: p.dataVencimento,
            dataPagamento: ["PAGO", "PARCIAL"].includes(p.status) ? p.dataPagamento || null : null,
            status: p.status,
          })),
          deletedParcelaIds
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
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vencimento e Controle das Parcelas</h4>
              <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">{parcelas.length} parcelas</span>
            </div>

            <div className="space-y-3">
              {parcelas.map((p, idx) => {
                return (
                  <div key={p.id || `new-${idx}`} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 relative group shadow-2xs">
                    {/* Botão de excluir parcela */}
                    <button
                      onClick={() => removeParcela(p.id, idx)}
                      type="button"
                      className="absolute top-3 right-3 text-slate-300 hover:text-red-600 p-1 cursor-pointer transition-colors"
                      title="Excluir Parcela"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                      <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                        {p.numero}
                      </span>
                      Parcela #{p.numero}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                      {/* Vencimento */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Vencimento</label>
                        <input
                          type="date"
                          value={p.dataVencimento}
                          onChange={(e) => updateParcela(p.id, idx, "dataVencimento", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                        />
                      </div>

                      {/* Principal */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Principal (Capital)</label>
                        <input
                          type="number"
                          step="any"
                          value={p.valorPrincipal}
                          onChange={(e) => updateParcela(p.id, idx, "valorPrincipal", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                        />
                      </div>

                      {/* Juros */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Juros</label>
                        <input
                          type="number"
                          step="any"
                          value={p.valorJuros}
                          onChange={(e) => updateParcela(p.id, idx, "valorJuros", Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Status</label>
                        <select
                          value={p.status}
                          onChange={(e) => updateParcela(p.id, idx, "status", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                        >
                          <option value="PENDENTE">Pendente</option>
                          <option value="PAGO">Pago</option>
                          <option value="ATRASADO">Atrasado</option>
                          <option value="PARCIAL">Parcial</option>
                        </select>
                      </div>

                      {/* Se for PAGO ou PARCIAL, exibe campos adicionais */}
                      {["PAGO", "PARCIAL"].includes(p.status) && (
                        <>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Valor Pago</label>
                            <input
                              type="number"
                              step="any"
                              value={p.valorPago ?? ""}
                              placeholder="R$ 0,00"
                              onChange={(e) => updateParcela(p.id, idx, "valorPago", e.target.value ? Number(e.target.value) : null)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Pago em</label>
                            <input
                              type="date"
                              value={p.dataPagamento ?? ""}
                              onChange={(e) => updateParcela(p.id, idx, "dataPagamento", e.target.value || null)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Adicionar Parcela */}
            <button
              onClick={addParcela}
              type="button"
              className="w-full rounded-xl border border-dashed border-slate-200 py-3 text-xs font-bold text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              Adicionar Nova Parcela
            </button>
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
