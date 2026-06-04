import { NextResponse } from "next/server";
import { storeExt } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const perfil = storeExt.perfis.update(id, body);
  if (!perfil) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  return NextResponse.json(perfil);
}
