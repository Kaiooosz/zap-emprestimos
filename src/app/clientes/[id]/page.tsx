import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Plus, ArrowUp, ArrowDown, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreGauge } from "@/components/clientes/ScoreGauge";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { getPontosLabel } from "@/lib/score/calcularScore";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = store.clientes.get(id);
  if (!c) notFound();

  const emprestimos    = store.emprestimos.list(id);
  const scoreData      = store.clientes.getScore(id);
  const capitalNaRua   = emprestimos
    .filter((e) => e.status === "ATIVO")
    .flatMap((e) => store.parcelas.list(e.id).filter((p) => ["PENDENTE","ATRASADO"].includes(p.status)))
    .reduce((s, p) => s + p.valorDevido, 0);
  const totalEmprestado = emprestimos.reduce((s, e) => s + e.valorPrincipal, 0);
  const parcelasPagas   = emprestimos.flatMap((e) => store.parcelas.list(e.id).filter((p) => p.status === "PAGO")).length;
  const totalParcelas   = emprestimos.flatMap((e) => store.parcelas.list(e.id)).length;
  const adimplencia     = totalParcelas > 0 ? Math.round((parcelasPagas / totalParcelas) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clientes"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <h1 className="text-base font-semibold text-slate-900">Perfil do Cliente</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* ── Coluna esquerda ── */}
        <div className="space-y-3">

          {/* Identidade */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-600 shrink-0">
                {c.nome[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-base">{c.nome}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.tipo === "PESSOA_JURIDICA" ? "Pessoa Jurídica" : "Pessoa Física"}</p>
                {c.cpf && <p className="text-xs text-slate-500 mt-0.5 font-mono">{c.cpf}</p>}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {c.phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={12} className="text-slate-400 shrink-0"/>
                    {c.phone}
                  </div>
                  <a
                    href={`https://wa.me/${c.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Olá *${c.nome}*!`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600 transition-colors">
                    <MessageCircle size={12}/>
                    WhatsApp
                  </a>
                </div>
              )}
              {c.email   && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail   size={12} className="text-slate-400 shrink-0"/>{c.email}</div>}
              {c.cidade  && <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin  size={12} className="text-slate-400 shrink-0"/>{c.cidade}{c.estado ? `, ${c.estado}` : ""}</div>}
              {c.profissao && <p className="text-xs text-slate-500">{c.profissao}{c.rendaMensal ? ` — ${formatarMoeda(c.rendaMensal)}/mês` : ""}</p>}
            </div>

            <p className="text-[10px] text-slate-400 mt-3">Cliente desde {formatarData(c.createdAt)}</p>
          </div>

          {/* Score */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Score de Crédito</p>
            <ScoreGauge score={scoreData.score} size={180} />

            {/* Regras simples */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Como é calculado</p>
              {[
                { l: "Pago antecipado",          p: "+35" },
                { l: "Pago no prazo",             p: "+20" },
                { l: "5 consecutivas",            p: "+50" },
                { l: "Contrato quitado",          p: "+100" },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{r.l}</span>
                  <span className="text-xs font-semibold text-slate-700">{r.p}</span>
                </div>
              ))}
              <div className="h-px bg-slate-100 my-1"/>
              {[
                { l: "Atraso 1-7 dias",  p: "-40" },
                { l: "Atraso 8-30 dias", p: "-100" },
                { l: "Atraso 31+ dias",  p: "-200" },
                { l: "Inadimplência",    p: "-350" },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{r.l}</span>
                  <span className="text-xs font-semibold text-slate-500">{r.p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Coluna direita ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Capital na Rua",   value: formatarMoeda(capitalNaRua) },
              { label: "Total Emprestado", value: formatarMoeda(totalEmprestado) },
              { label: "Contratos",        value: String(emprestimos.length) },
              { label: "Adimplência",      value: `${adimplencia}%` },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{k.label}</p>
                <p className="text-base font-bold text-slate-900 mt-1">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Histórico de pontuação */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Histórico de Pontuação</h2>
                <p className="text-xs text-slate-400 mt-0.5">{scoreData.eventos.length} eventos · score inicial: 500</p>
              </div>
              <span className="text-lg font-black text-slate-900 tabular-nums">{scoreData.score}</span>
            </div>

            {scoreData.eventos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Nenhum pagamento registrado</p>
            ) : (
              <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                {scoreData.eventos.map((ev, i) => {
                  const positivo = ev.pontos > 0;
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${positivo ? "bg-slate-100" : "bg-slate-100"}`}>
                        {positivo
                          ? <ArrowUp size={11} className="text-slate-600"/>
                          : <ArrowDown size={11} className="text-slate-400"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700">{ev.descricao}</p>
                        <p className="text-[10px] text-slate-400">{formatarData(ev.data)}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${positivo ? "text-slate-900" : "text-slate-400"}`}>
                        {getPontosLabel(ev.pontos)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Histórico de empréstimos */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Contratos</h2>
              <Link href={`/emprestimos/novo?clienteId=${c.id}`}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-700 transition-colors">
                <Plus size={12}/> Novo contrato
              </Link>
            </div>

            {emprestimos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum contrato</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {emprestimos.map((e) => {
                  const pagas = store.parcelas.list(e.id).filter((p) => p.status === "PAGO").length;
                  const pct   = e.numParcelas > 0 ? (pagas / e.numParcelas) * 100 : 0;
                  return (
                    <Link key={e.id} href={`/emprestimos/${e.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <StatusBadge status={e.status}/>
                          <span className="text-xs text-slate-400">{formatarData(e.dataInicio)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{formatarMoeda(e.valorTotal)}</span>
                          <span className="text-xs text-slate-400">{e.taxaJuros}% · {e.numParcelas}x</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 w-20">
                        <p className="text-xs text-slate-500 mb-1">{pagas}/{e.numParcelas} pagas</p>
                        <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-slate-400 transition-all" style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Garantia do cliente */}
          {c.garantia && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Garantia Registrada</p>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.tipoGarantia}</p>
                  {c.descricaoGarantia && <p className="text-xs text-slate-500 mt-0.5">{c.descricaoGarantia}</p>}
                </div>
                {c.valorGarantia && (
                  <p className="text-sm font-bold text-slate-900 shrink-0">{formatarMoeda(c.valorGarantia)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
