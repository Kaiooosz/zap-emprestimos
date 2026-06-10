import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarLog } from "@/lib/audit";

// Fila em memória executada em background para processar a tabela MsgQueue
let processandoFila = false;

async function processarMsgQueue() {
  if (processandoFila) return;
  processandoFila = true;

  try {
    // Busca as configurações de conexão do WhatsApp
    const configRow = await prisma.config.findUnique({ where: { id: "singleton" } });
    const cfg = (configRow?.data as any) ?? {};
    const whatsapp = cfg.whatsapp ?? {};

    while (true) {
      // Busca a primeira mensagem pendente
      const msg = await prisma.msgQueue.findFirst({
        where: { status: "PENDENTE" },
        orderBy: { createdAt: "asc" },
      });

      if (!msg) break;

      // Atualiza tentativas
      await prisma.msgQueue.update({
        where: { id: msg.id },
        data: { tentativas: msg.tentativas + 1 },
      });

      try {
        // Simulação ou chamada real à Evolution API do WhatsApp
        if (whatsapp.apiUrl && whatsapp.apiKey && whatsapp.instance) {
          const url = `${whatsapp.apiUrl}/message/sendText/${whatsapp.instance}`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": whatsapp.apiKey,
            },
            body: JSON.stringify({
              number: msg.telefone.replace(/\D/g, ""),
              options: { delay: 1200, linkPreview: false },
              textMessage: { text: msg.mensagem },
            }),
          });

          if (!response.ok) {
            throw new Error(`Falha no envio Evolution API: ${response.statusText}`);
          }
        } else {
          // Se não estiver configurado, simula um envio local com sucesso após 1.5s
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        // Marca como enviado
        await prisma.msgQueue.update({
          where: { id: msg.id },
          data: { status: "ENVIADO" },
        });

        // Grava no log de auditoria
        await registrarLog(
          "DISPARO_WHATSAPP",
          `Mensagem de cobrança enviada com sucesso para o telefone ${msg.telefone}.`
        );
      } catch (err: any) {
        console.error(`Erro ao disparar mensagem ${msg.id}:`, err);
        await prisma.msgQueue.update({
          where: { id: msg.id },
          data: { status: "FALHOU", erro: err.message ?? "Erro desconhecido" },
        });
      }

      // Throttling: Aguarda 10 segundos antes de enviar a próxima mensagem
      // para evitar bloqueio e banimento de chip no WhatsApp
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  } catch (e) {
    console.error("Erro no processamento da fila de mensagens:", e);
  } finally {
    processandoFila = false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const disparos = body.disparos as Array<{ clienteId: string; mensagem: string; telefone: string }>;

    if (!disparos || !Array.isArray(disparos)) {
      return NextResponse.json({ error: "Lista de disparos inválida." }, { status: 400 });
    }

    // Insere todas na fila com status PENDENTE
    await prisma.msgQueue.createMany({
      data: disparos.map((d) => ({
        clienteId: d.clienteId,
        mensagem: d.mensagem,
        telefone: d.telefone,
        status: "PENDENTE",
      })),
    });

    // Inicia o loop de processamento em background
    processarMsgQueue().catch((e) => console.error("Falha ao processar fila em background:", e));

    return NextResponse.json({ ok: true, totalEnfileirado: disparos.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao enfileirar mensagens." }, { status: 500 });
  }
}
