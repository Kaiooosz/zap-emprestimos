import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { action, id, conteudo, nome } = await request.json();

    if (action === "CREATE") {
      const newTemplate = await prisma.template.create({
        data: {
          id: `tpl_${Date.now()}`,
          nome: nome || "Novo Template",
          conteudo: conteudo || "",
          ativo: true,
        },
      });
      return NextResponse.json(newTemplate);
    }

    if (action === "RENAME") {
      const template = await prisma.template.update({
        where: { id },
        data: { nome },
      });
      return NextResponse.json(template);
    }

    if (action === "DELETE") {
      await prisma.template.delete({
        where: { id },
      });
      return NextResponse.json({ success: true });
    }

    // Default UPDATE
    if (!id || typeof conteudo !== "string") {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const template = await prisma.template.update({
      where: { id },
      data: { conteudo },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("Erro ao salvar template:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
