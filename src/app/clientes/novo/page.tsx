"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, FileText, Building2, User } from "lucide-react";

type TipoCliente = "PESSOA_FISICA" | "PESSOA_JURIDICA";
type TipoGarantia = "IMOVEL" | "VEICULO" | "CHEQUE" | "NOTA_PROMISSORIA" | "FIADOR" | "OUTRO";

const garantiasOpts: { value: TipoGarantia; label: string }[] = [
  { value: "IMOVEL",           label: "Imóvel" },
  { value: "VEICULO",          label: "Veículo" },
  { value: "CHEQUE",           label: "Cheque" },
  { value: "NOTA_PROMISSORIA", label: "Nota Promissória" },
  { value: "FIADOR",           label: "Fiador/Avalista" },
  { value: "OUTRO",            label: "Outro" },
];

export default function NovoClientePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<TipoCliente>("PESSOA_FISICA");
  const [temContrato, setTemContrato] = useState(false);
  const [garantia, setGarantia] = useState(false);
  const [perfilTaxa, setPerfilTaxa] = useState<string>("10");
  const [taxaPadrao, setTaxaPadrao] = useState<string>("10");
  const [form, setForm] = useState({
    nome: "", cpf: "", cnpj: "", phone: "", email: "",
    endereco: "", cidade: "", estado: "", profissao: "",
    rendaMensal: "", referencia: "", observacoes: "",
    tipoGarantia: "IMOVEL" as TipoGarantia,
    valorGarantia: "", descricaoGarantia: "",
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        ...form,
        tipo,
        temContrato,
        garantia,
        rendaMensal: form.rendaMensal ? Number(form.rendaMensal) : undefined,
        valorGarantia: form.valorGarantia ? Number(form.valorGarantia) : undefined,
        tipoGarantia: garantia ? form.tipoGarantia : undefined,
        descricaoGarantia: garantia ? form.descricaoGarantia : undefined,
        perfilTaxa,
        taxaPadrao: taxaPadrao ? Number(taxaPadrao) : undefined,
      };
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      router.push(`/clientes/${data.id}`);
    } catch {
      alert("Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Novo Cliente</h1>
          <p className="text-xs text-slate-500 mt-0.5">Score inicial: 500 pontos</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Tipo de pessoa */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tipo de Cliente</p>
          <div className="grid grid-cols-2 gap-3">
            {([["PESSOA_FISICA", "Pessoa Física", User], ["PESSOA_JURIDICA", "Pessoa Jurídica", Building2]] as const).map(([v, l, Icon]) => (
              <button key={v} type="button" onClick={() => setTipo(v)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${tipo === v ? "bg-blue-50 border-blue-700 text-blue-700" : "border-slate-200 text-slate-700 hover:border-slate-400"}`}>
                <Icon size={18} />
                <span className="text-sm font-medium">{l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dados {tipo === "PESSOA_FISICA" ? "Pessoais" : "da Empresa"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <F label={tipo === "PESSOA_FISICA" ? "Nome completo *" : "Razão Social *"} value={form.nome} onChange={(v) => set("nome", v)} required />
            </div>
            {tipo === "PESSOA_FISICA" ? (
              <F label="CPF" value={form.cpf} onChange={(v) => set("cpf", v)} placeholder="000.000.000-00" />
            ) : (
              <F label="CNPJ" value={form.cnpj} onChange={(v) => set("cnpj", v)} placeholder="00.000.000/0001-00" />
            )}
            <F label="Telefone *" value={form.phone} onChange={(v) => set("phone", v)} placeholder="(11) 99999-0000" required />
            <F label="E-mail" value={form.email} onChange={(v) => set("email", v)} type="email" />
            {tipo === "PESSOA_FISICA" && (
              <>
                <F label="Profissão" value={form.profissao} onChange={(v) => set("profissao", v)} />
                <F label="Renda Mensal (R$)" value={form.rendaMensal} onChange={(v) => set("rendaMensal", v)} type="number" />
              </>
            )}
            <div className="col-span-1 sm:col-span-2">
              <F label="Endereço" value={form.endereco} onChange={(v) => set("endereco", v)} />
            </div>
            <F label="Cidade" value={form.cidade} onChange={(v) => set("cidade", v)} />
            <F label="Estado" value={form.estado} onChange={(v) => set("estado", v)} placeholder="SP" />
            <div className="col-span-1 sm:col-span-2">
              <F label="Referência / Fiador" value={form.referencia} onChange={(v) => set("referencia", v)} placeholder="Nome e telefone do fiador ou referência" />
            </div>
          </div>
        </div>

        {/* Contrato + Garantia */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contrato e Garantias</p>

          {/* Tem contrato */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => setTemContrato(!temContrato)}>
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">Contrato Formal Assinado</p>
                <p className="text-xs text-slate-500">O cliente assinou ou assinará um contrato com validade jurídica</p>
              </div>
            </div>
            <Toggle active={temContrato} />
          </div>

          {/* Tem garantia */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => setGarantia(!garantia)}>
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">Deixou Garantia</p>
                <p className="text-xs text-slate-500">Imóvel, veículo, cheque, nota promissória ou fiador</p>
              </div>
            </div>
            <Toggle active={garantia} />
          </div>

          {garantia && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 pl-4 border-l-2 border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo de Garantia</label>
                <select value={form.tipoGarantia} onChange={(e) => set("tipoGarantia", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500">
                  {garantiasOpts.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <F label="Valor da Garantia (R$)" value={form.valorGarantia} onChange={(v) => set("valorGarantia", v)} type="number" />
              <div className="col-span-1 sm:col-span-2">
                <F label="Descrição da Garantia" value={form.descricaoGarantia} onChange={(v) => set("descricaoGarantia", v)} placeholder="Ex: Honda Civic 2022, placa XYZ-1234" />
              </div>
            </div>
          )}
        </div>

        {/* Perfil Financeiro (Taxa Padrão) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Perfil Financeiro</p>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 font-normal">Selecione o perfil aplicável a este cliente (Taxa Média)</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "10", label: "Perfil 10%" },
                { value: "20", label: "Perfil 20%" },
                { value: "30", label: "Perfil 30%" },
                { value: "CUSTOM", label: "Personalizar" }
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setPerfilTaxa(item.value);
                    if (item.value !== "CUSTOM") {
                      setTaxaPadrao(item.value);
                    }
                  }}
                  className={`rounded-xl py-2.5 text-xs font-semibold border transition-all ${perfilTaxa === item.value ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          {perfilTaxa === "CUSTOM" ? (
            <div>
              <F
                label="Taxa de Juros Padrão Personalizada (%)"
                value={taxaPadrao}
                onChange={setTaxaPadrao}
                type="number"
                placeholder="Ex: 15"
              />
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 font-normal">
              Este cliente terá a taxa de juros padrão configurada para <strong className="text-slate-800 font-semibold">{perfilTaxa}%</strong> ao criar novos empréstimos.
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Observações</label>
          <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
            placeholder="Informações adicionais sobre o cliente..." />
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-xl border border-blue-700 bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors">
          {loading ? "Cadastrando..." : "Cadastrar Cliente"}
        </button>
      </form>
    </div>
  );
}

function F({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type={type} value={type === "number" && value !== "" && value !== undefined ? String(Number(value)) : value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors" />
    </div>
  );
}

function Toggle({ active }: { active: boolean }) {
  return (
    <div className={`relative h-5 w-9 rounded-full transition-colors ${active ? "bg-slate-400" : "bg-slate-700"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${active ? "left-4" : "left-0.5"}`} />
    </div>
  );
}
