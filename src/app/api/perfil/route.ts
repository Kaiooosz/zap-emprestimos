import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashSenha } from "@/lib/password";
import { registrarLog } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, nome: true, email: true, phone: true, role: true, ativo: true, createdAt: true },
    });

    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar perfil." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { nome, email, phone, senha } = body;

    if (!nome || !email) {
      return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
    }

    // Verifica se e-mail pertence a outro
    const existe = await prisma.user.findFirst({
      where: { email, id: { not: session.sub } },
    });

    if (existe) {
      return NextResponse.json({ error: "E-mail já está em uso por outra conta." }, { status: 409 });
    }

    const updateData: any = { nome, email, phone: phone || null };
    if (senha && senha.trim() !== "") {
      updateData.passwordHash = hashSenha(senha);
    }

    const updated = await prisma.user.update({
      where: { id: session.sub },
      data: updateData,
      select: { id: true, nome: true, email: true, phone: true, role: true },
    });

    await registrarLog(
      "SISTEMA",
      `Atualizou o próprio perfil (Nome: ${updated.nome}, E-mail: ${updated.email})`
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar perfil." }, { status: 500 });
  }
}
