import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json(store.clientes.list());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cliente = store.clientes.create(body);
  return NextResponse.json(cliente, { status: 201 });
}
