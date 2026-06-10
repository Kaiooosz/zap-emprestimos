import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body   = await req.json();
    const { role, ativo, senha } = body;

    const data: Record<string, unknown> = {};
    if (role  !== undefined) data.role  = role;
    if (ativo !== undefined) data.ativo = ativo;
    if (senha)               data.passwordHash = hashSenha(senha);

    const membro = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, nome: true, email: true, phone: true, role: true, ativo: true, createdAt: true },
    });

    return NextResponse.json(membro);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao atualizar membro." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Verifica se há empréstimos vinculados
    const vinculados = await prisma.emprestimo.count({ where: { operadorId: id } });
    if (vinculados > 0) {
      // Não remove fisicamente — apenas desativa
      const membro = await prisma.user.update({
        where: { id },
        data:  { ativo: false },
        select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true },
      });
      return NextResponse.json({ ...membro, aviso: "Membro desativado pois possui contratos vinculados." });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao remover membro." }, { status: 500 });
  }
}
