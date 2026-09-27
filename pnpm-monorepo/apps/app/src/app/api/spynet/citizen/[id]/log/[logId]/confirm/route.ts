import { prisma } from "@/db";
import { requireAuthenticationApi } from "@/modules/auth/server";
import { CITIZEN_LOG_GUARD_SELECT } from "@/modules/citizen/queries/citizenLogTableSelect";
import {
  ConfirmationValue,
  toConfirmationStatus,
} from "@/modules/citizen/utils/citizenLogConfirmation";
import { confirmLog } from "@/modules/citizen/utils/confirmLog";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
import { NextResponse } from "next/server";
import * as z from "zod";

type Params = Promise<{
  id: string;
  logId: string;
}>;

const paramsSchema = z.object({
  id: z.cuid(),
  logId: z.cuid(),
});

const patchBodySchema = z.object({
  /** The body cannot remove a decision, thus "unconfirmed" fails the pipe */
  confirmed: z
    .enum(ConfirmationValue)
    .transform(toConfirmationStatus)
    .pipe(z.enum(ConfirmationStatus)),
});

export async function PATCH(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate the request
     */
    await requireAuthenticationApi(
      "/api/spynet/citizen/[id]/log/[logId]/confirm",
      "PATCH",
    );

    /**
     * Validate the request
     */
    const paramsData = paramsSchema.parse(await props.params);
    const body: unknown = await request.json();
    const data = patchBodySchema.parse(body);
    const citizenLog = await prisma.citizenLog.findFirst({
      where: {
        id: paramsData.logId,
      },
      select: CITIZEN_LOG_GUARD_SELECT,
    });
    if (!citizenLog) throw new Error("Not found");

    /**
     * Confirm the log
     */
    const confirmedAttribute = await confirmLog(citizenLog, data.confirmed);

    /**
     * Respond with the result
     */
    return NextResponse.json(confirmedAttribute);
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
