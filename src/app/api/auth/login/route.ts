import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSenha, signToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json();

    if (!email || !senha) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user || !user.ativo) {
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    if (user.passwordHash !== hashSenha(senha)) {
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }

    const token = await signToken({
      sub:   user.id,
      email: user.email,
      nome:  user.nome,
      role:  user.role,
    });

    const res = NextResponse.json({
      ok:    true,
      user:  { id: user.id, nome: user.nome, email: user.email, role: user.role },
    });

    res.cookies.set(setSessionCookie(token));
    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
