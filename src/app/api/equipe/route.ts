import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hashSenha } from "@/lib/password";

export async function GET() {
  try {
    const membros = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, nome: true, email: true, phone: true, role: true, ativo: true, createdAt: true },
    });
    return NextResponse.json(membros);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar membros." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem criar membros." }, { status: 403 });
    }

    const body = await req.json();
    const { nome, email, phone, role, senha } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
    }

    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    const membro = await prisma.user.create({
      data: {
        nome,
        email,
        phone:        phone || null,
        role:         role ?? "OPERADOR",
        passwordHash: hashSenha(senha),
        ativo:        true,
      },
      select: { id: true, nome: true, email: true, phone: true, role: true, ativo: true, createdAt: true },
    });

    return NextResponse.json(membro, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao criar membro." }, { status: 500 });
  }
}
