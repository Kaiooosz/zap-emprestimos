import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contas = await prisma.contaPagar.findMany({ orderBy: { dataVencimento: "asc" } });
    return NextResponse.json(contas);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Erro." }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json();
    const conta = await prisma.contaPagar.create({
      data: {
        descricao:      body.descricao,
        categoria:      body.categoria ?? "OUTROS",
        valor:          Number(body.valor),
        dataVencimento: new Date(body.dataVencimento),
        status:         "PENDENTE",
        recorrente:     body.recorrente ?? false,
      },
    });
    return NextResponse.json(conta, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Erro." }, { status: 500 }); }
}
