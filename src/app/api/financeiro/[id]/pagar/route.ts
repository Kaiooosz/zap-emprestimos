import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = store.contas.pagar(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}
