import { NextResponse } from "next/server";

/** Local upload stub — replace with object storage in production. */
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json(
    { error: "Upload não configurado neste ambiente" },
    { status: 501 },
  );
}
