import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma 7 driver adapter (@prisma/adapter-pg) a pg musia zostať mimo
  // server bundlu – majú dynamické/natívne require, ktoré webpack nevie zbaliť.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
