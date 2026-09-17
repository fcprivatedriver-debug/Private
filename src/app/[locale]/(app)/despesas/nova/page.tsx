import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ExpenseForm } from "@/components/finance/Forms";
import { getNinaSpace } from "@/actions/household";

export default async function NovaDespesaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const [categories, accounts, members, space] = await Promise.all([
    prisma.category.findMany({ where: { familyId: membership.familyId }, orderBy: { name: "asc" } }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
    prisma.familyMember.findMany({ where: { familyId: membership.familyId } }),
    getNinaSpace(),
  ]);

  return (
    <div className="page-stack nova-despesa-page">
      <h1 className="page-title">Nova despesa</h1>
      <ExpenseForm
        categories={categories}
        accounts={accounts}
        members={members}
        space={space}
      />
    </div>
  );
}
