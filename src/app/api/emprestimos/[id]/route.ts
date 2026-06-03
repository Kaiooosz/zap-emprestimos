import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = store.emprestimos.get(id);
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parcelas = store.parcelas.list(id);
  const cliente = store.clientes.get(e.clienteId);
  return NextResponse.json({ ...e, parcelas, cliente });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  const e = store.emprestimos.updateStatus(id, status);
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(e);
}
