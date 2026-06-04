import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { ScoreGauge } from "@/components/clientes/ScoreGauge";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { getPontosLabel } from "@/lib/score/calcularScore";

export const dynamic = "force-dynamic";

const eventoConfig: Record<string, { cor: string; bg: string; positivo: boolean }> = {
  PAGO_ANTECIPADO:    { cor: "text-emerald-400", bg: "bg-emerald-500/10", positivo: true },
  PAGO_NO_PRAZO:      { cor: "text-emerald-400", bg: "bg-emerald-500/10", positivo: true },
  QUITACAO_COMPLETA:  { cor: "text-emerald-400", bg: "bg-emerald-500/10", positivo: true },
  VOLUME_ALTO:        { cor: "text-emerald-400", bg: "bg-emerald-500/10", positivo: true },
  CONSECUTIVAS_BONUS: { cor: "text-emerald-400", bg: "bg-emerald-500/10", positivo: true },
  ATRASO_LEVE:        { cor: "text-orange-400",  bg: "bg-orange-500/10",  positivo: false },
  ATRASO_MODERADO:    { cor: "text-red-400",     bg: "bg-red-500/10",     positivo: false },
  ATRASO_GRAVE:       { cor: "text-red-500",     bg: "bg-red-600/10",     positivo: false },
  ATRASADO:           { cor: "text-red-400",     bg: "bg-red-500/10",     positivo: false },
  INADIMPLENTE:       { cor: "text-red-600",     bg: "bg-red-700/10",     positivo: false },
};

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = store.clientes.get(id);
  if (!c) notFound();

  const emprestimos = store.emprestimos.list(id);
  const scoreData   = store.clientes.getScore(id);
  const capitalNaRua = emprestimos
    .filter((e) => e.status === "ATIVO")
    .flatMap((e) => store.parcelas.list(e.id).filter((p) => ["PENDENTE","ATRASADO"].includes(p.status)))
    .reduce((s, p) => s + p.valorDevido, 0);
  const totalEmprestado = emprestimos.reduce((s, e) => s + e.valorPrincipal, 0);
  const parcelasPagas   = emprestimos.flatMap((e) => store.parcelas.list(e.id).filter((p) => p.status === "PAGO")).length;
  const totalParcelas   = emprestimos.flatMap((e) => store.parcelas.list(e.id)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <h1 className="text-base font-semibold text-slate-900 tracking-tight">Perfil do Cliente</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* === Esquerda: Perfil + Gauge === */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-700 shrink-0">
                {c.nome[0]}
              </div>
              <div>
                <p className="font-bold text-slate-900">{c.nome}</p>
                <p className="text-xs text-slate-400 mt-0.5">{c.cpf ?? "Sem CPF"}</p>
                <p className="text-xs text-slate-500">Desde {formatarData(c.createdAt)}</p>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              {c.phone && <div className="flex items-center gap-2 text-xs text-slate-400"><Phone size={12} className="text-slate-600"/>{c.phone}</div>}
              {c.email && <div className="flex items-center gap-2 text-xs text-slate-400"><Mail size={12} className="text-slate-600"/>{c.email}</div>}
              {c.cidade && <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin size={12} className="text-slate-600"/>{c.cidade}</div>}
            </div>
          </div>

          {/* Gauge */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">Score de Credito</p>
            <ScoreGauge score={scoreData.score} size={220} />

            <div className="mt-4 pt-4 border-t border-slate-200 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tabela de Pontos</p>
              {[
                { l: "Pago antecipado (3+ dias)",  p: "+35", pos: true },
                { l: "Pago no prazo",              p: "+20", pos: true },
                { l: "5 consecutivas no prazo",   p: "+50 bonus", pos: true },
                { l: "Emprestimo quitado",         p: "+100", pos: true },
                { l: "Volume pago > R$5.000",      p: "+75 bonus", pos: true },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{r.l}</span>
                  <span className="text-xs font-bold text-emerald-400">{r.p}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2">
                {[
                  { l: "Atraso 1-7 dias",  p: "-40" },
                  { l: "Atraso 8-30 dias", p: "-100" },
                  { l: "Atraso 31+ dias",  p: "-200" },
                  { l: "Inadimplencia",    p: "-350" },
                ].map((r) => (
                  <div key={r.l} className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-slate-500">{r.l}</span>
                    <span className="text-xs font-bold text-red-400">{r.p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* === Direita: KPIs + Histórico + Empréstimos === */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Capital na Rua",   value: formatarMoeda(capitalNaRua), accent: true },
              { label: "Total Emprestado", value: formatarMoeda(totalEmprestado) },
              { label: "Contratos",        value: String(emprestimos.length) },
              { label: "Adimplencia",      value: totalParcelas > 0 ? `${Math.round((parcelasPagas/totalParcelas)*100)}%` : "—" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">{k.label}</p>
                <p className={`text-base font-bold mt-0.5 ${k.accent ? "text-blue-700" : "text-slate-900"}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Histórico de eventos */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">Historico de Pontuacao</h2>
              <p className="text-xs text-slate-500 mt-0.5">{scoreData.eventos.length} eventos · Score inicial: 500</p>
            </div>
            {scoreData.eventos.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-10">Nenhum pagamento registrado ainda</p>
            ) : (
              <div className="divide-y divide-[#152035]/60 max-h-64 overflow-y-auto">
                {scoreData.eventos.map((ev, i) => {
                  const cfg = eventoConfig[ev.tipo] ?? eventoConfig.PAGO_NO_PRAZO;
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        {cfg.positivo
                          ? <TrendingUp size={12} className={cfg.cor}/>
                          : <TrendingDown size={12} className={cfg.cor}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800">{ev.descricao}</p>
                        <p className="text-xs text-slate-500">{formatarData(ev.data)}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${ev.pontos > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {getPontosLabel(ev.pontos)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Empréstimos */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">Historico de Emprestimos</h2>
              <Link href={`/emprestimos/novo?clienteId=${c.id}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 hover:underline">
                <Plus size={12}/> Novo
              </Link>
            </div>
            {emprestimos.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-8">Nenhum emprestimo</p>
            ) : (
              <div className="divide-y divide-[#152035]/60">
                {emprestimos.map((e) => {
                  const pagas = store.parcelas.list(e.id).filter((p) => p.status === "PAGO").length;
                  return (
                    <Link key={e.id} href={`/emprestimos/${e.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={e.status}/>
                          <span className="text-xs text-slate-500">{formatarData(e.dataInicio)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">{formatarMoeda(e.valorTotal)}</span>
                          <span className="text-xs text-slate-500">{e.taxaJuros}% · {e.numParcelas}x</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500">{pagas}/{e.numParcelas} pagas</p>
                        <div className="h-1 w-16 rounded-full bg-slate-700 mt-1 ml-auto overflow-hidden">
                          <div className="h-full rounded-full bg-[#6A95B4]" style={{ width: `${(pagas/e.numParcelas)*100}%` }}/>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
