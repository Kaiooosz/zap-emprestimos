import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptCliente, decryptCliente } from "@/lib/crypto";
import { registrarLog } from "@/lib/audit";

/**
 * GET /api/clientes
 * Retorna a listagem de todos os clientes com dados descriptografados.
 */
export async function GET() {
  try {
    const clientesRaw = await prisma.cliente.findMany({
      orderBy: { createdAt: "desc" },
    });
    const clientes = clientesRaw.map(decryptCliente);
    return NextResponse.json(clientes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar clientes." }, { status: 500 });
  }
}

/**
 * POST /api/clientes
 * Cria um novo cliente com dados sensíveis criptografados e registra a ação no log de auditoria.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Criptografa dados sensíveis para conformidade com a LGPD
    const dataCliente = {
      ...encryptCliente({
        tipo:             body.tipo ?? "PESSOA_FISICA",
        nome:             body.nome,
        cpf:              body.cpf || null,
        phone:            body.phone,
        email:            body.email || null,
        endereco:         body.endereco || null,
        cidade:           body.cidade || null,
        estado:           body.estado || null,
        profissao:        body.profissao || null,
        rendaMensal:      body.rendaMensal ? Number(body.rendaMensal) : null,
        score:            500,
        temContrato:      body.temContrato ?? false,
        garantia:         body.garantia ?? false,
        tipoGarantia:     body.tipoGarantia || null,
        valorGarantia:    body.valorGarantia ? Number(body.valorGarantia) : null,
        descGarantia:     body.descricaoGarantia || null,
        referencia:       body.referencia || null,
        observacoes:      body.observacoes || null,
      }),
      perfilTaxa:       body.perfilTaxa || null,
      taxaPadrao:       body.taxaPadrao ? Number(body.taxaPadrao) : null,
    };

    const cliente = await prisma.cliente.create({
      data: dataCliente,
    });

    // Registra log de auditoria
    await registrarLog(
      "CRIAR_CLIENTE",
      `Cliente ${cliente.nome} cadastrado com sucesso. Score inicial de 500.`
    );

    // Retorna os dados descriptografados para o client
    return NextResponse.json(decryptCliente(cliente), { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar cliente." }, { status: 500 });
  }
}
