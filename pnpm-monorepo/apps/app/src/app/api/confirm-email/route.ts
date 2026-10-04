import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getEmailConfirmationToken } from "@/modules/auth/queries/getEmailConfirmationToken";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";

const schema = z.object({
  token: z.cuid2(),
});

/**
 * The `Referrer-Policy: no-referrer` header of this route is in
 * `next.config.ts`. A header of a route handler cannot replace a header of
 * the config.
 */
export async function GET(request: NextRequest) {
  try {
    /**
     * Validate the request
     */
    const paramsData = schema.parse({
      token: request.nextUrl.searchParams.get("token"),
    });

    const result = await getEmailConfirmationToken(paramsData.token);
    if (!result)
      return NextResponse.redirect(new URL("/email-confirmation", request.url));

    /**
     * Confirm the email address
     */
    await prisma.$transaction([
      prisma.emailConfirmationToken.deleteMany({
        where: {
          userId: result.userId,
        },
      }),

      prisma.user.update({
        where: {
          id: result.userId,
        },
        data: {
          emailVerified: new Date(),
        },
      }),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.EMAIL_VERIFIED_VIA_TOKEN,
        data: {
          userId: result.userId,
        },
        createdById: result.userId,
      },
    ]);

    return NextResponse.redirect(new URL("/clearance", request.url));
  } catch (error) {
    return apiErrorHandler(error);
  }
}
