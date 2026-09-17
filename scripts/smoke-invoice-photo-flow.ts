/**
 * Smoke: captura → StoredObject → leitura órfã (sem Expense) → anexar a despesa → re-leitura.
 * Corre: npx tsx scripts/smoke-invoice-photo-flow.ts
 */
import { prisma } from "../src/lib/db";
import { storeReceiptFromFormFile, resolveFamilyReceiptAttachment, familyOwnsReceiptUrl } from "../src/lib/receipts";
import { readStoredFile, deleteStoredFile, storageKeyFromUploadUrl } from "../src/lib/storage";
import { recognizeReceipt } from "../src/lib/ocr";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "demo@nina.app" } });
  if (!user) throw new Error("demo missing — corre npm run db:demo");
  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!membership) throw new Error("membership missing");

  const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const body = Buffer.alloc(4096, 0xcd);
  const bytes = Buffer.concat([header, body, Buffer.from([0xff, 0xd9])]);
  const file = new File([bytes], "talao-captura.jpg", { type: "image/jpeg" });

  // 1. Guardar como na captura instantânea (sem Expense)
  const up = await storeReceiptFromFormFile({
    familyId: membership.familyId,
    userId: user.id,
    file,
  });
  if (!up.ok) throw new Error("store failed: " + up.error);
  console.log("PASS store", up.stored.url, up.kind);

  // 2. OCR stub honesto
  const ocr = await recognizeReceipt({ fileName: file.name });
  if (ocr.available || ocr.totalCents !== 0 || ocr.items.length > 0) {
    throw new Error("OCR inventou dados");
  }
  console.log("PASS ocr stub", ocr.unavailableReason?.slice(0, 60));

  // 3. Ler de volta sem Expense (órfão)
  const key = storageKeyFromUploadUrl(up.stored.url);
  if (!key) throw new Error("bad url");
  const read = await readStoredFile(key);
  if (!read.bytes.equals(bytes)) throw new Error("bytes mismatch");
  console.log("PASS orphan read", read.mimeType, read.bytes.length);

  // 4. Ownership + resolve para Nova despesa
  if (!(await familyOwnsReceiptUrl(membership.familyId, up.stored.url))) {
    throw new Error("familyOwns failed");
  }
  if (await familyOwnsReceiptUrl("outra-familia", up.stored.url)) {
    throw new Error("cross-family should fail");
  }
  const attached = await resolveFamilyReceiptAttachment(membership.familyId, up.stored.url);
  if (!attached?.receiptImageUrl) throw new Error("resolve attachment failed");
  console.log("PASS resolve attachment", attached.receiptImageUrl);

  // 5. Anexar a despesa e confirmar persistência pós-"logout" (re-query)
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
      amountCents: 1999,
      date: new Date(),
      description: "Smoke captura fatura",
      scope: "PERSONAL",
      paymentMethod: "DEBIT_CARD",
      receiptImageUrl: attached.receiptImageUrl,
    },
  });
  const again = await prisma.expense.findUnique({ where: { id: expense.id } });
  if (again?.receiptImageUrl !== attached.receiptImageUrl) throw new Error("expense lost receipt");
  const read2 = await readStoredFile(key);
  if (!read2.bytes.equals(bytes)) throw new Error("bytes lost after expense link");
  console.log("PASS expense linked + re-read", expense.id);

  // 6. Rejeitar ficheiro demasiado grande (mensagem segura)
  const huge = new File([Buffer.alloc(5 * 1024 * 1024 + 10)], "huge.jpg", { type: "image/jpeg" });
  const tooBig = await storeReceiptFromFormFile({
    familyId: membership.familyId,
    userId: user.id,
    file: huge,
  });
  if (tooBig.ok) throw new Error("should reject large file");
  if (!/5 MB/i.test(tooBig.error)) throw new Error("bad size message: " + tooBig.error);
  if (/prisma|InvalidArg|Neon/i.test(tooBig.error)) throw new Error("leaked internals");
  console.log("PASS size limit message");

  await prisma.expense.delete({ where: { id: expense.id } });
  await deleteStoredFile(key);
  console.log("PASS cleanup");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
