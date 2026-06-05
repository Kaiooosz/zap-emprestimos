import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const emprestimo = await prisma.emprestimo.findUnique({
      where:   { id },
      include: { parcelas: { orderBy: { numero: "asc" } }, cliente: true },
    });
    if (!emprestimo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(emprestimo);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Erro interno." }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body   = await req.json();
    const emprestimo = await prisma.emprestimo.update({ where: { id }, data: { status: body.status } });
    return NextResponse.json(emprestimo);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Erro." }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.emprestimo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Erro." }, { status: 500 }); }
}
