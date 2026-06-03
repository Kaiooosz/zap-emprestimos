import { storeExt } from "@/lib/store";
import { ConfiguracoesClient } from "@/components/configuracoes/ConfiguracoesClient";

export const dynamic = "force-dynamic";

export default function ConfiguracoesPage() {
  const empresa  = storeExt.config.getEmpresa();
  const whatsapp = storeExt.config.getWhatsApp();
  const templates = storeExt.templates.list();

  return (
    <ConfiguracoesClient
      empresa={empresa}
      whatsapp={whatsapp}
      templates={templates}
    />
  );
}
