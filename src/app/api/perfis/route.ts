import { NextResponse } from "next/server";
import { storeExt } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(storeExt.perfis.list());
}

export async function POST(req: Request) {
  const body = await req.json();
  const perfil = storeExt.perfis.create(body);
  return NextResponse.json(perfil, { status: 201 });
}
