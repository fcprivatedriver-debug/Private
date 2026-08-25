import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "FC Private Driver",
    mode: "marketing-site",
  });
}
