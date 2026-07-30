import { prisma } from "@/db";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { NextResponse } from "next/server";
import { z } from "zod";

const postBodySchema = z.object({
  name: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/manufacturer",
      "POST",
    );
    await authentication.authorizeApi(
      "manufacturersSeriesAndVariants",
      "manage",
    );

    /**
     * Validate the request body
     */
    const body: unknown = await request.json();
    const data = postBodySchema.parse(body);

    /**
     * Create
     */
    const createdItem = await prisma.manufacturer.create({
      data: {
        name: data.name,
      },
    });

    return NextResponse.json(createdItem);
  } catch (error) {
    return apiErrorHandler(error);
  }
}
