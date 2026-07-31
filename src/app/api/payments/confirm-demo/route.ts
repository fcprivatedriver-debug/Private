import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { confirmDemoPaymentAction } from "@/actions/payments";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let paymentId: string | undefined;
  try {
    const body = await request.json();
    paymentId = body.paymentId;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  if (!paymentId) {
    return NextResponse.json({ error: "paymentId em falta." }, { status: 400 });
  }

  const result = await confirmDemoPaymentAction(paymentId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: result.success });
}
