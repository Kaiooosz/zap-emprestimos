import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conta  = await prisma.contaPagar.update({
      where: { id },
      data:  { status: "PAGO", dataPagamento: new Date() },
    });
    return NextResponse.json(conta);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Erro." }, { status: 500 }); }
}
