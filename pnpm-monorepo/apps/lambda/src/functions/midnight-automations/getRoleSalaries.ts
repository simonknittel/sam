import { prisma } from "@sam-monorepo/database";
import { captureAsyncFunc } from "../../common/xray";

export const getRoleSalaries = async () => {
  return captureAsyncFunc("getRoleSalaries", async () => {
    return await prisma.silcRoleSalary.findMany();
  });
};
