import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getEmailConfirmationToken } from "@/modules/auth/queries/getEmailConfirmationToken";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.cuid2(),
});

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
      return NextResponse.redirect(
        new URL("/email-confirmation", request.url),
        {
          headers: {
            "Referrer-Policy": "no-referrer",
          },
        },
      );

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

    return NextResponse.redirect(new URL("/clearance", request.url), {
      headers: {
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return apiErrorHandler(error, {
      headers: {
        "Referrer-Policy": "no-referrer",
      },
    });
  }
}
