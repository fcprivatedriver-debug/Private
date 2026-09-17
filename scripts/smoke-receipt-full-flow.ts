import { prisma } from "../src/lib/db";
import { storeFamilyFile, readStoredFile, deleteStoredFile } from "../src/lib/storage";
import { storeReceiptFromFormFile } from "../src/lib/receipts";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "demo@nina.app" } });
  if (!user) throw new Error("demo missing");
  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!membership) throw new Error("membership missing");

  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const body = Buffer.alloc(2048, 0xab);
  const bytes = Buffer.concat([header, body, Buffer.from([0xff, 0xd9])]);

  const file = new File([bytes], "fatura-teste.jpg", { type: "image/jpeg" });
  const up = await storeReceiptFromFormFile({
    familyId: membership.familyId,
    userId: user.id,
    file,
  });
  if (!up.ok) throw new Error("storeReceipt failed: " + up.error);
  console.log("1. stored", up.stored.url, up.stored.sizeBytes);

  const cat = await prisma.category.findFirst({
    where: { familyId: membership.familyId, kind: "EXPENSE" },
  });
  if (!cat) throw new Error("no category");

  const expense = await prisma.expense.create({
    data: {
      familyId: membership.familyId,
      categoryId: cat.id,
      memberId: membership.id,
      createdById: user.id,
      amountCents: 1234,
      date: new Date(),
      description: "Teste fatura StoredObject",
      scope: "PERSONAL",
      paymentMethod: "DEBIT_CARD",
      receiptImageUrl: up.stored.url,
    },
  });
  console.log("2. expense", expense.id);

  const read = await readStoredFile(up.stored.storageKey);
  console.log("3. read back match", read.bytes.equals(bytes), "mime", read.mimeType);

  await prisma.$disconnect();
  // fresh import still sees same DB module singleton — query again
  const { prisma: p2 } = await import("../src/lib/db");
  const still = await p2.expense.findUnique({ where: { id: expense.id } });
  console.log("4. persisted receipt url", still?.receiptImageUrl === up.stored.url);

  try {
    await storeFamilyFile({
      familyId: "nonexistent-family-id-xxx",
      fileName: "x.jpg",
      mimeType: "image/jpeg",
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    console.log("5. expected failure missing");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("5. safe error:", msg);
    console.log("5. embeds prisma?", /prisma|InvalidArg|JS functions|Raw query/i.test(msg));
  }

  await p2.expense.delete({ where: { id: expense.id } });
  await deleteStoredFile(up.stored.storageKey);
  console.log("6. cleanup ok");
  await p2.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
