import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(clientes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar clientes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cliente = await prisma.cliente.create({
      data: {
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
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar cliente." }, { status: 500 });
  }
}
