import { store } from "@/lib/store";
import { formatarMoeda } from "@/lib/utils";
import { CalendarioClient } from "@/components/calendario/CalendarioClient";

export const dynamic = "force-dynamic";

export default function CalendarioPage() {
  store.parcelas.marcarAtrasadas();

  const clientes   = store.clientes.list();
  const emprestimos = store.emprestimos.list();
  const todasParcelas = store.parcelas.list().map((p) => {
    const e = emprestimos.find((e) => e.id === p.emprestimoId);
    const c = clientes.find((c) => c.id === e?.clienteId);
    return {
      ...p,
      clienteId:   c?.id ?? "",
      clienteNome: c?.nome ?? "—",
      clientePhone:c?.phone ?? "—",
    };
  });

  return (
    <CalendarioClient
      parcelas={todasParcelas}
      clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
    />
  );
}
