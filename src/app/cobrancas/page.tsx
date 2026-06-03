import { store } from "@/lib/store";
import { storeExt } from "@/lib/store";
import { CobrancasClient } from "@/components/cobrancas/CobrancasClient";

export const dynamic = "force-dynamic";

export default function CobrancasPage() {
  store.parcelas.marcarAtrasadas();

  const pendentes = store.parcelas
    .list()
    .filter((p) => ["ATRASADO", "PENDENTE"].includes(p.status))
    .map((p) => {
      const emp = store.emprestimos.get(p.emprestimoId)!;
      const cli = store.clientes.get(emp?.clienteId ?? "");
      const hoje = new Date();
      const venc = new Date(p.dataVencimento);
      const diasAtraso = p.status === "ATRASADO"
        ? Math.floor((hoje.getTime() - venc.getTime()) / 86400000)
        : 0;
      return {
        id: p.id,
        parcelaNum: p.numero,
        totalParcelas: emp?.numParcelas ?? 0,
        clienteId:   cli?.id ?? "",
        clienteNome: cli?.nome ?? "—",
        clientePhone:cli?.phone ?? "—",
        score:       cli?.score ?? 0,
        valorDevido: p.valorDevido,
        dataVencimento: p.dataVencimento,
        status:      p.status,
        diasAtraso,
        emprestimoId: p.emprestimoId,
      };
    })
    .sort((a, b) => b.diasAtraso - a.diasAtraso);

  const templates = storeExt.templates.list().filter((t) => t.ativo);
  const empresa   = storeExt.config.getEmpresa();
  const whatsapp  = storeExt.config.getWhatsApp();

  return (
    <CobrancasClient
      pendentes={pendentes}
      templates={templates}
      empresaNome={empresa.nomeFantasia}
      empresaTelefone={empresa.telefone}
      whatsappStatus={whatsapp.status}
    />
  );
}
