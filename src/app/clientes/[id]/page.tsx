import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Plus, ArrowUp, ArrowDown, MessageCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreGauge } from "@/components/clientes/ScoreGauge";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { getPontosLabel, getFaixa } from "@/lib/score/calcularScore";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = store.clientes.get(id);
  if (!c) notFound();

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const emprestimos     = store.emprestimos.list(id);
  const scoreData       = store.clientes.getScore(id);
  const totalEmprestado = emprestimos.reduce((s, e) => s + e.valorPrincipal, 0);
  const parcelasPagas   = emprestimos.flatMap((e) => store.parcelas.list(e.id).filter((p) => p.status === "PAGO")).length;
  const totalParcelas   = emprestimos.flatMap((e) => store.parcelas.list(e.id)).length;
  const adimplencia     = totalParcelas > 0 ? Math.round((parcelasPagas / totalParcelas) * 100) : 0;

  // Todas as parcelas em aberto (pendente + atrasado + parcial)
  const parcelasAbertas = emprestimos
    .filter((e) => e.status !== "CANCELADO")
    .flatMap((e) =>
      store.parcelas.list(e.id)
        .filter((p) => ["PENDENTE","ATRASADO","PARCIAL"].includes(p.status))
        .map((p) => {
          const venc = new Date(p.dataVencimento);
          venc.setHours(0, 0, 0, 0);
          const diff = Math.floor((venc.getTime() - hoje.getTime()) / 86400000);
          return { ...p, emprestimo: e, diff };
        })
    )
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

  const totalEmAberto   = parcelasAbertas.reduce((s, p) => s + p.valorDevido, 0);
  const atrasadas       = parcelasAbertas.filter((p) => p.diff < 0);
  const totalAtrasado   = atrasadas.reduce((s, p) => s + p.valorDevido, 0);
  const proximasHoje    = parcelasAbertas.filter((p) => p.diff === 0);
  const proximasFuturas = parcelasAbertas.filter((p) => p.diff > 0 && p.diff <= 7);

  // KPI: capital na rua = tudo em aberto
  const capitalNaRua = totalEmAberto;

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
                  <a href={`https://wa.me/${c.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Olá *${c.nome}*!`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors">
                    <MessageCircle size={12}/>WhatsApp
                  </a>
                </div>
              )}
              {c.email    && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail   size={12} className="text-slate-400 shrink-0"/>{c.email}</div>}
              {c.cidade   && <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={12} className="text-slate-400 shrink-0"/>{c.cidade}{c.estado ? `, ${c.estado}` : ""}</div>}
              {c.profissao && <p className="text-xs text-slate-500">{c.profissao}{c.rendaMensal ? ` — ${formatarMoeda(c.rendaMensal)}/mês` : ""}</p>}
            </div>
            <p className="text-[10px] text-slate-400 mt-3">Cliente desde {formatarData(c.createdAt)}</p>
          </div>

          {/* Score */}
          {(() => {
            const { label } = getFaixa(scoreData.score);
            const pct = (scoreData.score / 1000) * 100;
            return (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-4 px-5 pt-5 pb-3">
                  <ScoreGauge score={scoreData.score} size={120} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Score de Crédito</p>
                    <p className="text-3xl font-black text-slate-900 leading-none mt-1 tabular-nums">{scoreData.score}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                    <div className="mt-3">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }}/>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-slate-400">0</span>
                        <span className="text-[10px] text-slate-400">{scoreData.eventos.length} eventos</span>
                        <span className="text-[10px] text-slate-400">1000</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 px-5 py-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Como é calculado</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      { l: "Pago antecipado", p: "+35" }, { l: "Atraso 1-7d",  p: "-40"  },
                      { l: "Pago no prazo",   p: "+20" }, { l: "Atraso 8-30d", p: "-100" },
                      { l: "5 consecutivas",  p: "+50" }, { l: "Atraso 31d+",  p: "-200" },
                      { l: "Quitado",         p: "+100"}, { l: "Inadimplência",p: "-350" },
                    ].map((r) => (
                      <div key={r.l} className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">{r.l}</span>
                        <span className={`text-[11px] font-semibold ${r.p.startsWith("+") ? "text-slate-700" : "text-slate-400"}`}>{r.p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Coluna direita ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Em Aberto",       value: formatarMoeda(capitalNaRua) },
              { label: "Total Emprestado",value: formatarMoeda(totalEmprestado) },
              { label: "Contratos",       value: String(emprestimos.length) },
              { label: "Adimplência",     value: `${adimplencia}%` },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{k.label}</p>
                <p className="text-base font-bold text-slate-900 mt-1">{k.value}</p>
              </div>
            ))}
          </div>

          {/* ── NEGOCIAÇÕES EM ABERTO ── */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {/* Header do card */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Negociações em Aberto</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{parcelasAbertas.length} parcela{parcelasAbertas.length !== 1 ? "s" : ""} · {formatarMoeda(totalEmAberto)} total</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  {atrasadas.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400">Em atraso</p>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{formatarMoeda(totalAtrasado)}</p>
                    </div>
                  )}
                  {proximasHoje.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400">Vence hoje</p>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{proximasHoje.length}</p>
                    </div>
                  )}
                  {proximasFuturas.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400">Próx. 7 dias</p>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{proximasFuturas.length}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {parcelasAbertas.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle size={24} className="text-slate-300 mx-auto mb-2"/>
                <p className="text-sm text-slate-400">Nenhuma parcela em aberto</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {parcelasAbertas.map((p) => {
                  const diasAtraso = p.diff < 0 ? Math.abs(p.diff) : 0;
                  const diasAte   = p.diff > 0 ? p.diff : 0;
                  const isHoje    = p.diff === 0;
                  const isAtrasado = p.status === "ATRASADO" || p.diff < 0;

                  const waMsg = c.phone
                    ? encodeURIComponent(
                        isAtrasado
                          ? `Olá *${c.nome}*!\n\nSua parcela *${p.numero}/${p.emprestimo.numParcelas}* de *${formatarMoeda(p.valorDevido)}* está em atraso há *${diasAtraso} dia${diasAtraso !== 1 ? "s" : ""}*.\n\nPor favor, regularize para evitar juros adicionais.\n\n_Zap Empréstimos_`
                          : `Olá *${c.nome}*!\n\nSua parcela *${p.numero}/${p.emprestimo.numParcelas}* de *${formatarMoeda(p.valorDevido)}* vence ${isHoje ? "*hoje*" : `em *${diasAte} dia${diasAte !== 1 ? "s" : ""}*`} (${formatarData(p.dataVencimento)}).\n\nEvite atrasos!\n\n_Zap Empréstimos_`
                      )
                    : "";

                  return (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                      {/* Status icon */}
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                        isAtrasado ? "bg-slate-100" : isHoje ? "bg-slate-100" : "bg-slate-50"
                      }`}>
                        {isAtrasado
                          ? <AlertTriangle size={12} className="text-slate-500"/>
                          : isHoje
                            ? <Clock size={12} className="text-slate-600"/>
                            : <Clock size={12} className="text-slate-400"/>}
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link href={`/emprestimos/${p.emprestimo.id}`}
                            className="text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors truncate">
                            {p.emprestimo.tipoProduto === "EMPRESTIMO" ? "Empréstimo" :
                             p.emprestimo.tipoProduto === "VENDA" ? "Venda Parc." :
                             p.emprestimo.tipoProduto === "ALUGUEL" ? "Aluguel" :
                             p.emprestimo.tipoProduto === "ASSINATURA" ? "Assinatura" :
                             p.emprestimo.tipoProduto}
                          </Link>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            Parc. {p.numero}/{p.emprestimo.numParcelas}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            Venc. {formatarData(p.dataVencimento)}
                          </span>
                          {isAtrasado && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              {diasAtraso}d atraso
                            </span>
                          )}
                          {isHoje && (
                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-full">
                              Vence hoje
                            </span>
                          )}
                          {!isAtrasado && !isHoje && diasAte <= 7 && (
                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                              em {diasAte}d
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Valor + badge */}
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">{formatarMoeda(p.valorDevido)}</p>
                        <StatusBadge status={p.status as any}/>
                      </div>

                      {/* WhatsApp */}
                      {c.phone && (
                        <a href={`https://wa.me/${c.phone.replace(/\D/g,"")}?text=${waMsg}`}
                          target="_blank" rel="noopener noreferrer"
                          title="Cobrar via WhatsApp"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all shrink-0">
                          <MessageCircle size={13}/>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resumo rodapé */}
            {parcelasAbertas.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{atrasadas.length} atrasada{atrasadas.length !== 1 ? "s" : ""}</span>
                  <span>{proximasHoje.length} vence hoje</span>
                  <span>{parcelasAbertas.filter(p => p.diff > 0).length} pendente{parcelasAbertas.filter(p => p.diff > 0).length !== 1 ? "s" : ""}</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 tabular-nums">{formatarMoeda(totalEmAberto)}</p>
              </div>
            )}
          </div>

          {/* Contratos */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Contratos</h2>
              <Link href={`/emprestimos/novo?clienteId=${c.id}`}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-700 transition-colors">
                <Plus size={12}/> Novo
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

          {/* Histórico de pontuação */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Histórico de Pontuação</h2>
                <p className="text-xs text-slate-400 mt-0.5">{scoreData.eventos.length} eventos</p>
              </div>
            </div>
            {scoreData.eventos.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum evento registrado</p>
            ) : (
              <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                {scoreData.eventos.map((ev, i) => {
                  const positivo = ev.pontos > 0;
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        {positivo ? <ArrowUp size={10} className="text-slate-600"/> : <ArrowDown size={10} className="text-slate-400"/>}
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

          {/* Garantia */}
          {c.garantia && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Garantia Registrada</p>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.tipoGarantia}</p>
                  {c.descricaoGarantia && <p className="text-xs text-slate-500 mt-0.5">{c.descricaoGarantia}</p>}
                </div>
                {c.valorGarantia && <p className="text-sm font-bold text-slate-900 shrink-0">{formatarMoeda(c.valorGarantia)}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
