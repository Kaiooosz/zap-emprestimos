import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptCliente, decryptCliente } from "@/lib/crypto";
import { registrarLog } from "@/lib/audit";

/**
 * GET /api/clientes/[id]
 * Retorna os detalhes de um cliente específico descriptografado.
 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        emprestimos: {
          include: { parcelas: { orderBy: { numero: "asc" } } },
          orderBy: { createdAt: "desc" },
        },
        scoreHistorico: { orderBy: { data: "desc" }, take: 50 },
      },
    });
    if (!cliente) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(decryptCliente(cliente));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

/**
 * PUT /api/clientes/[id]
 * Atualiza um cliente com dados sensíveis criptografados e registra log de auditoria.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Criptografa os dados para conformidade com a LGPD
    const dataCliente = encryptCliente({
      nome:          body.nome,
      cpf:           body.cpf || null,
      phone:         body.phone,
      email:         body.email || null,
      endereco:      body.endereco || null,
      cidade:        body.cidade || null,
      estado:        body.estado || null,
      profissao:     body.profissao || null,
      rendaMensal:   body.rendaMensal ? Number(body.rendaMensal) : null,
      temContrato:   body.temContrato ?? false,
      garantia:      body.garantia ?? false,
      tipoGarantia:  body.tipoGarantia || null,
      valorGarantia: body.valorGarantia ? Number(body.valorGarantia) : null,
      descGarantia:  body.descricaoGarantia || null,
      observacoes:   body.observacoes || null,
    });

    const cliente = await prisma.cliente.update({
      where: { id },
      data: dataCliente,
    });

    // Registra log de auditoria
    await registrarLog(
      "ATUALIZAR_CLIENTE",
      `Dados do cliente ${cliente.nome} atualizados.`
    );

    return NextResponse.json(decryptCliente(cliente));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

/**
 * DELETE /api/clientes/[id]
 * Exclui um cliente e registra a ação no log de auditoria.
 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.cliente.delete({ where: { id } });

    // Registra log de auditoria
    await registrarLog(
      "EXCLUIR_CLIENTE",
      `Cliente ${cliente.nome} excluído com sucesso.`
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao deletar." }, { status: 500 });
  }
}
