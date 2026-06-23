"use client";

import { useState } from "react";
import { X, Plus, Trash2, Smartphone, Banknote, CreditCard, MoreHorizontal, Save } from "lucide-react";
import { Parcela } from "@/lib/store";
import { formatarMoeda } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  parcela: Parcela;
  onClose: () => void;
}

export type TipoMeioPagamento = "PIX" | "CEDULA" | "TRANSFERENCIA" | "CHEQUE" | "OUTRO";

export interface MeioPagamento {
  tipo: TipoMeioPagamento;
  descricao?: string;
  valor: string;
}

const MEIOS_CONFIG: Record<TipoMeioPagamento, { label: string; icon: any; cor: string }> = {
  PIX:          { label: "Pix",           icon: Smartphone,     cor: "text-emerald-600" },
  CEDULA:       { label: "Cédula (Esp.)", icon: Banknote,       cor: "text-yellow-600"  },
  TRANSFERENCIA:{ label: "Transferência", icon: CreditCard,     cor: "text-blue-600"    },
  CHEQUE:       { label: "Cheque",        icon: MoreHorizontal, cor: "text-slate-600"   },
  OUTRO:        { label: "Outro",         icon: MoreHorizontal, cor: "text-slate-500"   },
};

export function ModalEditarPagamento({ parcela, onClose }: Props) {
  const router = useRouter();
  const formasIniciais = parcela.formasPagamento && typeof parcela.formasPagamento === "string" 
    ? JSON.parse(parcela.formasPagamento) 
    : [];
  
  const dataPagamentoInicial = parcela.dataPagamento
    ? new Date(parcela.dataPagamento).toISOString().slice(0, 16) // yyyy-mm-ddThh:mm
    : new Date().toISOString().slice(0, 16);

  const [dataPagamento, setDataPagamento] = useState(dataPagamentoInicial);
  const [meios, setMeios] = useState<MeioPagamento[]>(
    formasIniciais.length > 0 
      ? formasIniciais.map((f: any) => ({ ...f, valor: String(f.valor) }))
      : [{ tipo: "PIX", valor: String(parcela.valorPago || 0) }]
  );
  const [loading, setLoading] = useState(false);

  const totalPago = Number(parcela.valorPago || 0);
  const totalMeios = meios.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
  const diferenca = Math.abs(totalMeios - totalPago);

  function addMeio() {
    setMeios((prev) => [...prev, { tipo: "CEDULA", valor: "" }]);
  }

  function removeMeio(idx: number) {
    setMeios((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMeio(idx: number, field: keyof MeioPagamento, value: string) {
    setMeios((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  async function handleSave() {
    if (diferenca > 0.01) {
      alert("A soma das formas de pagamento deve ser exatamente igual ao valor que já foi pago na parcela!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        dataPagamento: new Date(dataPagamento).toISOString(),
        formasPagamento: meios.map(m => ({
          tipo: m.tipo,
          descricao: m.descricao,
          valor: Number(m.valor)
        }))
      };

      const res = await fetch(`/api/parcelas/${parcela.id}/editar-pagamento`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar alterações");
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Ocorreu um erro ao salvar as alterações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Editar Pagamento</h2>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5">Parcela {parcela.numero}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mb-2">
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Atenção</p>
            <p className="text-xs text-blue-700 mt-1">
              Apenas a data do pagamento e o meio como foi pago (Pix, Dinheiro, etc) podem ser alterados nesta tela. O valor total registrado ({formatarMoeda(totalPago)}) permanece igual para não afetar o saldo do contrato.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Data e Hora do Pagamento</label>
            <input
              type="datetime-local"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Formas de Pagamento</label>
            </div>

            <div className="space-y-2">
              {meios.map((meio, idx) => {
                const cfg = MEIOS_CONFIG[meio.tipo] || MEIOS_CONFIG["OUTRO"];
                const Icon = cfg.icon;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={meio.tipo}
                        onChange={(e) => updateMeio(idx, "tipo", e.target.value as TipoMeioPagamento)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 cursor-pointer"
                      >
                        {(Object.keys(MEIOS_CONFIG) as TipoMeioPagamento[]).map((t) => (
                          <option key={t} value={t}>{MEIOS_CONFIG[t].label}</option>
                        ))}
                      </select>
                      <Icon size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${cfg.cor} pointer-events-none`} />
                    </div>

                    {meio.tipo === "OUTRO" && (
                      <input
                        type="text"
                        placeholder="Descreva..."
                        value={meio.descricao ?? ""}
                        onChange={(e) => updateMeio(idx, "descricao", e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:outline-none focus:border-slate-400"
                      />
                    )}

                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={meio.valor}
                        onChange={(e) => updateMeio(idx, "valor", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-2 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-400 text-right"
                      />
                    </div>

                    {meios.length > 1 && (
                      <button onClick={() => removeMeio(idx)} className="text-slate-300 hover:text-red-500 p-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addMeio}
              className="w-full rounded-xl border border-dashed border-slate-200 py-2 text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={13} /> Adicionar forma
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-600">Soma declarada:</span>
            <span className={`text-sm font-bold ${diferenca > 0.01 ? "text-red-600" : "text-emerald-600"}`}>
              {formatarMoeda(totalMeios)} / {formatarMoeda(totalPago)}
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={loading || diferenca > 0.01}
            className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-colors"
          >
            <Save size={16} />
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
