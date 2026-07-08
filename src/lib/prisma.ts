import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 používa query compiler + driver adapter (bez Rust enginu).
// Klient sa preto vytvára s Pg adaptérom; connection string berie z env
// (DATABASE_URL načíta Next.js z .env).
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// V dev režime sa modul reloaduje pri HMR – držíme jednu inštanciu na globe,
// aby sme neotvárali nové spojenia pri každom reloade.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
