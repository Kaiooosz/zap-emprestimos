import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = store.clientes.get(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const emprestimos = store.emprestimos.list(id);
  const parcelas = store.parcelas.list().filter((p) => emprestimos.find((e) => e.id === p.emprestimoId));
  return NextResponse.json({ ...c, emprestimos, parcelas });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const c = store.clientes.update(id, body);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = store.clientes.delete(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
