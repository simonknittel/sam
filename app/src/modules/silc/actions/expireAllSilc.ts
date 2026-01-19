"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { updateCitizensSilcBalances } from "../utils/updateCitizensSilcBalances";

export const expireAllSilc = async () => {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction("expireAllSilc");
    if (!authentication.session.entity) {
      log.info("Unauthorized request to action", {
        actionName: "expireAllSilc",
        userId: authentication.session.user.id,
        reason: "Insufficient permissions",
      });

      throw new Error("Forbidden");
    }
    await authentication.authorizeAction("silcBalanceOfOtherCitizen", "manage");

    /**
     * Update citizens' balances
     */
    const citizens = await prisma.entity.findMany({
      select: { id: true, silcBalance: true },
      where: { silcBalance: { gt: 0 } },
    });

    await prisma.silcTransaction.createMany({
      data: citizens.map((citizen) => ({
        receiverId: citizen.id,
        value: -citizen.silcBalance,
        description: "Verfallen",
        createdById: authentication.session.entity!.id,
      })),
    });

    await updateCitizensSilcBalances(citizens.map((citizen) => citizen.id));

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/silc");
    revalidatePath("/app/silc/transactions");
    revalidatePath("/app/dashboard");

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich gespeichert.",
    };
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error:
        "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
    };
  }
};
