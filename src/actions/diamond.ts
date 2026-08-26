"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notify, sendEmail, emailShell } from "@/lib/notifications";
import type { ActionState } from "@/actions/auth";
import { addMonths } from "date-fns";
import { applyMinuteTransaction } from "@/lib/minutes/ledger";

export async function submitDiamondProposalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const estimatedUsers = Number(formData.get("estimatedUsers") || 0) || null;
  const tripsPerWeek = Number(formData.get("tripsPerWeek") || 0) || null;
  const usualHours = String(formData.get("usualHours") || "").trim() || null;
  const serviceZone = String(formData.get("serviceZone") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!name || !email || !phone) {
    return { error: "Preencha nome, e-mail e telefone." };
  }

  const proposal = await prisma.diamondProposal.create({
    data: {
      name,
      company,
      email,
      phone,
      estimatedUsers,
      tripsPerWeek,
      usualHours,
      serviceZone,
      notes,
      status: "RECEIVED",
    },
  });

  await sendEmail({
    to: email,
    subject: "Pedido Diamante recebido — FC Private Driver",
    html: emailShell(
      "Pedido recebido",
      `Olá ${name}, obrigado pelo interesse no plano Diamante. A nossa equipa vai analisar a sua proposta e contactá-lo em breve.`,
    ),
  });

  await sendEmail({
    to: "fcprivatedriver@gmail.com",
    subject: `Nova proposta Diamante — ${name}${company ? ` (${company})` : ""}`,
    html: emailShell(
      "Nova proposta Diamante",
      `<p><strong>${name}</strong>${company ? ` · ${company}` : ""}</p>
       <p>${email} · ${phone}</p>
       <p>Utilizadores: ${estimatedUsers ?? "—"} · Viagens/semana: ${tripsPerWeek ?? "—"}</p>
       <p>Horários: ${usualHours ?? "—"}</p>
       <p>Zona: ${serviceZone ?? "—"}</p>
       <p>${notes ?? ""}</p>
       <p>ID: ${proposal.id}</p>`,
    ),
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await notify({
      userId: admin.id,
      email: admin.email,
      type: "DIAMOND_PROPOSAL",
      title: "Nova proposta Diamante",
      body: `${name} solicitou uma proposta personalizada.`,
      channels: ["IN_APP"],
    });
  }

  await prisma.adminAuditLog.create({
    data: {
      action: "DIAMOND_PROPOSAL_CREATED",
      entityType: "DiamondProposal",
      entityId: proposal.id,
      meta: JSON.stringify({ email, company }),
    },
  });

  revalidatePath("/pt/admin/diamante");
  return {
    success:
      "Pedido enviado com sucesso. Enviámos uma confirmação para o seu e-mail. A equipa FC Private Driver entrará em contacto.",
  };
}

export async function updateDiamondStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Sem permissão." };

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const adminNotes = String(formData.get("adminNotes") || "") || null;
  if (!id || !status) return { error: "Dados inválidos." };

  await prisma.diamondProposal.update({
    where: { id },
    data: {
      status: status as never,
      adminNotes,
      contactedAt: status === "CONTACTED" ? new Date() : undefined,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session.user.id,
      action: "DIAMOND_STATUS_UPDATE",
      entityType: "DiamondProposal",
      entityId: id,
      meta: JSON.stringify({ status }),
    },
  });

  revalidatePath("/pt/admin/diamante");
  return { success: "Estado atualizado." };
}

/** Convert an accepted Diamond proposal into a personalised plan + optional subscription. */
export async function convertDiamondProposalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return { error: "Sem permissão." };

  const proposalId = String(formData.get("proposalId") || "");
  const priceEuros = Number(formData.get("priceEuros") || 0);
  const monthlyMinutes = Number(formData.get("monthlyMinutes") || 0);
  const specialConditions = String(formData.get("specialConditions") || "") || null;
  const renewalDate = String(formData.get("renewalDate") || "");
  const internalNotes = String(formData.get("internalNotes") || "") || null;
  const activateNow = formData.get("activateNow") === "on";
  const customerEmail = String(formData.get("customerEmail") || "").toLowerCase();

  if (!proposalId || !priceEuros || !monthlyMinutes) {
    return { error: "Indique proposta, valor mensal e minutos." };
  }

  const proposal = await prisma.diamondProposal.findUnique({ where: { id: proposalId } });
  if (!proposal) return { error: "Proposta não encontrada." };
  if (proposal.status !== "ACCEPTED") {
    return { error: "Apenas propostas com estado «Aceite» podem ser convertidas." };
  }

  const code = `diamante-${proposal.id.slice(-6)}-${Date.now().toString(36)}`;
  const plan = await prisma.plan.create({
    data: {
      code,
      tier: "custom",
      namePt: `Diamante — ${proposal.company || proposal.name}`,
      nameEn: `Diamond — ${proposal.company || proposal.name}`,
      descriptionPt: specialConditions || "Plano personalizado Diamante",
      descriptionEn: specialConditions || "Personalised Diamond plan",
      showPrice: true,
      priceCents: Math.round(priceEuros * 100),
      monthlyMinutes,
      equivalentHours: Math.round((monthlyMinutes / 60) * 10) / 10,
      active: true,
      isPersonalized: true,
      sortOrder: 100,
      accentColor: "#0A4F5C",
      ctaLabelPt: "Plano personalizado",
      ctaLabelEn: "Custom plan",
      featuresJson: JSON.stringify([
        `${monthlyMinutes} minutos mensais`,
        "Serviço exclusivo Diamante",
        specialConditions || "Condições acordadas",
      ]),
      specialConditions,
      internalNotes,
    },
  });

  let subscriptionId: string | undefined;
  const email = customerEmail || proposal.email;
  let user = await prisma.user.findUnique({ where: { email } });

  if (activateNow) {
    if (!user) {
      const { hash } = await import("bcryptjs");
      user = await prisma.user.create({
        data: {
          email,
          name: proposal.name,
          phone: proposal.phone,
          role: "CUSTOMER",
          status: "ACTIVE",
          emailVerified: new Date(),
          passwordHash: await hash(`tmp-${Date.now()}`, 12),
          customerProfile: {
            create: {
              fullName: proposal.name,
              phone: proposal.phone,
              profileComplete: false,
            },
          },
        },
      });
    }

    const periodStart = renewalDate ? new Date(renewalDate) : new Date();
    if (Number.isNaN(periodStart.getTime())) {
      return { error: "Data de renovação inválida." };
    }
    const periodEnd = addMonths(periodStart, 1);

    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: "ACTIVE",
        periodStart,
        periodEnd,
        nextRenewalAt: periodEnd,
        minutesIncluded: monthlyMinutes,
        minutesUsed: 0,
        minutesReserved: 0,
        autoRenew: true,
      },
    });
    subscriptionId = sub.id;

    await applyMinuteTransaction({
      userId: user.id,
      subscriptionId: sub.id,
      type: "PLAN_RENEWAL",
      minutes: monthlyMinutes,
      reason: `Ativação plano personalizado Diamante (${plan.namePt})`,
      actorId: session.user.id,
      counter: "included",
    });

    await notify({
      userId: user.id,
      email: user.email,
      type: "PLAN_ACTIVATED",
      title: "Plano Diamante ativado",
      body: `O seu plano personalizado está ativo com ${monthlyMinutes} minutos mensais.`,
    });
  }

  await prisma.diamondProposal.update({
    where: { id: proposalId },
    data: {
      convertedPlanId: plan.id,
      convertedSubscriptionId: subscriptionId,
      convertedAt: new Date(),
      adminNotes: internalNotes || proposal.adminNotes,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session.user.id,
      action: "DIAMOND_CONVERTED",
      entityType: "DiamondProposal",
      entityId: proposalId,
      reason: "Conversão em plano personalizado",
      meta: JSON.stringify({ planId: plan.id, subscriptionId, priceEuros, monthlyMinutes }),
    },
  });

  revalidatePath("/pt/admin/diamante");
  revalidatePath("/pt/admin/planos");
  revalidatePath("/pt/planos");
  return {
    success: activateNow
      ? "Proposta convertida e subscrição personalizada ativada."
      : "Plano personalizado criado. Pode ativar a subscrição quando o pagamento estiver confirmado.",
  };
}
