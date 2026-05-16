"use server";

import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";

const schema = z.object({
  blueprintId: z.cuid2(),
});

export const toggleBlueprintUnlockAction = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    const authentication = await requireAuthenticationAction(
      "toggleBlueprintUnlockAction",
    );
    await authentication.authorizeAction("myBlueprint", "manage");
    if (!authentication.session.entity) throw new Error("Forbidden");

    const result = schema.safeParse({
      blueprintId: formData.get("blueprintId"),
    });
    if (!result.success) {
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };
    }

    const citizenId = authentication.session.entity.id;
    const blueprintId = result.data.blueprintId;

    const existingUnlock = await prisma.blueprintUnlock.findUnique({
      where: {
        citizenId_blueprintId: {
          citizenId,
          blueprintId,
        },
      },
      include: {
        blueprint: {
          include: {
            item: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const itemName = existingUnlock?.blueprint.item.name ?? null;

    if (existingUnlock) {
      await prisma.blueprintUnlock.delete({
        where: {
          citizenId_blueprintId: {
            citizenId,
            blueprintId,
          },
        },
      });

      await createAuditEvents([
        {
          type: AuditEventType.BLUEPRINT_LOCKED,
          data: {
            blueprintId,
            citizenId,
            itemName: itemName ?? "Unknown",
          },
          createdById: authentication.session.user.id,
        },
      ]);
    } else {
      const blueprint = await prisma.blueprint.findUnique({
        where: { id: blueprintId },
        include: {
          item: {
            select: {
              name: true,
            },
          },
        },
      });

      await prisma.blueprintUnlock.create({
        data: {
          citizenId,
          blueprintId,
        },
      });

      await createAuditEvents([
        {
          type: AuditEventType.BLUEPRINT_UNLOCKED,
          data: {
            blueprintId,
            citizenId,
            itemName: blueprint?.item.name ?? "Unknown",
          },
          createdById: authentication.session.user.id,
        },
      ]);
    }

    revalidatePath("/app/blueprints");
    revalidatePath(`/app/blueprints/${blueprintId}`);

    return {
      success: t("Common.successfullySaved"),
    };
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
