import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = `smoke${Date.now()}@test.zrik`;
  const passwordHash = await bcrypt.hash("test1234", 10);
  const u = await prisma.user.create({
    data: {
      name: "Smoke User",
      email,
      passwordHash,
      role: "CUSTOMER",
      customerProfile: { create: {} },
    },
  });
  console.log("registered", u.email, u.role);

  const found = await prisma.user.findUnique({ where: { email } });
  const ok = found && (await bcrypt.compare("test1234", found.passwordHash!));
  console.log("login-hash-ok", ok);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
