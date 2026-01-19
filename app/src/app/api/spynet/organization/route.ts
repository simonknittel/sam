import { prisma } from "@/db";
import { saveObject } from "@/modules/algolia";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { scrapeOrganizationLogo } from "@/modules/common/utils/scrapeOrganizationLogo";
import { log } from "@/modules/logging";
import { getOrganizationBySpectrumId } from "@/modules/organizations/queries";
import { ConfirmationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { serializeError } from "serialize-error";
import { z } from "zod";

const postBodySchema = z.object({
  spectrumId: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    /**
     * Authenticate the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/organization",
      "POST",
    );
    if (!authentication.session.entity) throw new Error("Forbidden");
    await authentication.authorizeApi("organization", "create");

    /**
     * Validate the request
     */
    const body: unknown = await request.json();
    const data = postBodySchema.parse(body);

    /**
     * Do the thing
     */
    const existingOrganization = await getOrganizationBySpectrumId(
      data.spectrumId,
    );
    if (existingOrganization) throw new Error("Duplicate");

    let logo: string | undefined;
    try {
      logo = await scrapeOrganizationLogo(data.spectrumId);
    } catch (error) {
      log.error("Failed to scrape organization logo", {
        spectrumId: data.spectrumId,
        error: serializeError(error),
      });
    }

    const createdOrganization = await prisma.organization.create({
      data: {
        spectrumId: data.spectrumId,
        name: data.name,
        logo,
        createdBy: {
          connect: {
            /**
             * We can use `!` here since at this point it's guaranteed that the user has an entity attached.
             * This is because permissions are attached to the entity and above we check for permissions. If the
             * user wouldn't have an entity, they also wouldn't have permissions and the request would have been
             * rejected above.
             * The only exception is with the `adminEnabled` cookie.
             */
            id: authentication.session.entity.id,
          },
        },
        attributeHistoryEntries: {
          create: {
            createdBy: {
              connect: {
                id: authentication.session.entity.id,
              },
            },
            attributeKey: "name",
            newValue: data.name,
            confirmed: ConfirmationStatus.CONFIRMED,
            confirmedAt: new Date(),
            confirmedBy: {
              connect: {
                id: authentication.session.entity.id,
              },
            },
          },
        },
      },
      select: {
        id: true,
        spectrumId: true,
        name: true,
      },
    });

    /**
     * Add new organization to Algolia
     */
    await saveObject(createdOrganization.id, {
      type: "organization",
      spectrumId: createdOrganization.spectrumId,
      names: [createdOrganization.name],
    });

    /**
     * Respond
     */
    return NextResponse.json(createdOrganization);
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
