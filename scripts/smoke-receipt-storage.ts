import { prisma } from "../src/lib/db";
import { storeFamilyFile, readStoredFile, deleteStoredFile, assertAllowedReceipt, StorageError } from "../src/lib/storage";

async function main() {
  const family = await prisma.family.findFirst();
  if (!family) throw new Error("no family — run db:demo");

  try {
    assertAllowedReceipt({ fileName: "x.exe", mimeType: "application/octet-stream", sizeBytes: 10 });
    throw new Error("should reject exe");
  } catch (e) {
    if (!(e instanceof StorageError)) throw e;
    console.log("reject exe ok");
  }

  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // jpeg header-ish
  const stored = await storeFamilyFile({
    familyId: family.id,
    fileName: "teste-fatura.jpg",
    mimeType: "image/jpeg",
    bytes,
  });
  console.log("stored", { url: stored.url, backend: stored.backend, size: stored.sizeBytes });

  const read = await readStoredFile(stored.storageKey);
  console.log("read match", read.bytes.equals(bytes), read.mimeType);

  await deleteStoredFile(stored.storageKey);
  const gone = await prisma.storedObject.findUnique({ where: { storageKey: stored.storageKey } });
  console.log("deleted", gone == null);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
