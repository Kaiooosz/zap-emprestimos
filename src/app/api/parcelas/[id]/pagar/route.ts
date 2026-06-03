import { NextRequest, NextResponse } from "next/server";
import { store, ModoPagamento } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parcela = store.parcelas.get(id);
  if (!parcela) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const modo: ModoPagamento = body.modo ?? "COMPLETO";
  const valorPago = body.valorPago ?? parcela.valorDevido;
  const result = store.parcelas.pagar(id, valorPago, modo);
  return NextResponse.json(result);
}
