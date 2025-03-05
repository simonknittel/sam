"use server";

import { authenticateAction } from "@/auth/server";
import { prisma } from "@/db";
import { log } from "@/logging";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { updateCitizensSilcBalances } from "../utils/updateCitizensSilcBalances";

export const refreshSilcBalances = async () => {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await authenticateAction("refreshSilcBalances");
    await authentication.authorizeAction("silcBalanceOfOtherCitizen", "manage");

    /**
     * Update citizens' balances
     */
    const citizens = await prisma.entity.findMany();
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
    void log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error:
        "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
    };
  }
};
