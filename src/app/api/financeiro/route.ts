import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json(store.contas.list());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const c = store.contas.create(body);
  return NextResponse.json(c, { status: 201 });
}
