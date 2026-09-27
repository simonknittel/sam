import { prisma } from "@sam-monorepo/database";

/** Gives each test an empty database */
export const truncateAllTables = async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  const quotedNames = tables
    .map(({ tablename }) => `"${tablename}"`)
    .join(", ");

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedNames} CASCADE`);
};
