import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Registra um log de auditoria no banco de dados.
 * Identifica automaticamente o usuário logado a partir da sessão.
 */
export async function registrarLog(acao: string, detalhes: string) {
  try {
    const session = await getSession();
    await prisma.auditLog.create({
      data: {
        userId: session?.sub ?? "sistema",
        userNome: session?.nome ?? "Sistema",
        acao,
        detalhes,
      },
    });
  } catch (error) {
    console.error("Falha ao registrar log de auditoria:", error);
  }
}
