/**
 * Creates (or promotes) an ADMIN user — production bootstrap tool.
 * Usage: npx tsx scripts/create-admin.ts <email> <password> "<Full Name>"
 * Password is hashed with the same scrypt parameters as the CMS.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const N = 16384, r = 8, p = 1;
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${scryptSync(password, salt, 64, { N, r, p }).toString("hex")}`;
}

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password || !name || password.length < 10) {
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password(min 10 chars)> "<Full Name>"');
    process.exit(1);
  }
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", name, isActive: true },
    create: { email, name, role: "ADMIN", passwordHash: hashPassword(password), isActive: true },
  });
  console.log(`✓ ADMIN ready: ${user.email} (${user.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
