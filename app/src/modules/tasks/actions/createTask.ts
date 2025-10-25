"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { triggerNotification } from "@/modules/notifications/components/utils/triggerNotification";
import { TaskRewardType, TaskVisibility, type Task } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";

const schema = z.object({
  visibility: z.nativeEnum(TaskVisibility),
  assignmentLimit: z.coerce.number().min(1).nullable(),
  assignedToIds: z.array(z.cuid()).max(250).optional(), // Arbitrary (untested) limit to prevent DDoS
  title: z.string().trim().max(64),
  description: z.string().trim().max(2048).optional(),
  expiresAt: z.coerce.date().optional(),
  rewardType: z.nativeEnum(TaskRewardType),
  rewardTypeTextValue: z.string().trim().max(2048).optional(),
  rewardTypeSilcValue: z.coerce.number().optional(),
  rewardTypeNewSilcValue: z.coerce.number().optional(),
  repeatable: z.coerce.number().min(1),
  requiredRoles: z.array(z.cuid()).max(50).optional(), // Arbitrary (untested) limit to prevent DDoS
  hiddenForOtherRoles: z.coerce.boolean().optional(),
  canSelfComplete: z.coerce.boolean().optional(),
});

export const createTask = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction("createTask");
    await authentication.authorizeAction("task", "create");
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      visibility: formData.get("visibility"),
      assignmentLimit:
        formData.has("assignmentLimit") &&
        formData.get("assignmentLimit") !== ""
          ? formData.get("assignmentLimit")
          : null,
      assignedToIds: formData.getAll("assignedToId[]"),
      title: formData.get("title"),
      description: formData.has("description")
        ? formData.get("description")
        : undefined,
      expiresAt:
        formData.get("expiresAt") && formData.get("expiresAt") !== ""
          ? formData.get("expiresAt")
          : undefined,
      rewardType: formData.get("rewardType"),
      rewardTypeTextValue: formData.has("rewardTypeTextValue")
        ? formData.get("rewardTypeTextValue")
        : undefined,
      rewardTypeSilcValue: formData.has("rewardTypeSilcValue")
        ? formData.get("rewardTypeSilcValue")
        : undefined,
      rewardTypeNewSilcValue: formData.has("rewardTypeNewSilcValue")
        ? formData.get("rewardTypeNewSilcValue")
        : undefined,
      repeatable: formData.get("repeatable"),
      requiredRoles: formData.getAll("requiredRole[]"),
      hiddenForOtherRoles: formData.get("hiddenForOtherRoles")
        ? formData.get("hiddenForOtherRoles")
        : undefined,
      canSelfComplete: formData.has("canSelfComplete")
        ? formData.get("canSelfComplete")
        : undefined,
    });
    if (!result.success)
      return {
        error: t("Common.badRequest"),
        errorDetails: result.error,
        requestPayload: formData,
      };

    /**
     * Authorize the request
     */
    if (
      (result.data.visibility === TaskVisibility.PERSONALIZED ||
        result.data.visibility === TaskVisibility.GROUP) &&
      !(await authentication.authorize("task", "create", [
        {
          key: "taskVisibility",
          value: TaskVisibility.PERSONALIZED,
        },
      ]))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (
      result.data.rewardType === TaskRewardType.NEW_SILC &&
      !(await authentication.authorize("task", "create", [
        {
          key: "taskRewardType",
          value: TaskRewardType.NEW_SILC,
        },
      ]))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Create task
     */
    const createdTasks: Pick<Task, "id">[] = [];
    switch (result.data.visibility) {
      case TaskVisibility.PUBLIC:
        createdTasks.push(
          await prisma.task.create({
            data: {
              visibility: result.data.visibility,
              assignmentLimit: result.data.assignmentLimit,
              title: result.data.title,
              description: result.data.description,
              createdBy: {
                connect: {
                  id: authentication.session.entity.id,
                },
              },
              expiresAt: result.data.expiresAt,
              rewardType: result.data.rewardType,
              rewardTypeTextValue: result.data.rewardTypeTextValue,
              rewardTypeSilcValue: result.data.rewardTypeSilcValue,
              rewardTypeNewSilcValue: result.data.rewardTypeNewSilcValue,
              repeatable: result.data.repeatable,
              requiredRoles: {
                connect: result.data.requiredRoles
                  ? result.data.requiredRoles.map((roleId) => ({
                      id: roleId,
                    }))
                  : [],
              },
              hiddenForOtherRoles: result.data.hiddenForOtherRoles,
            },
            select: {
              id: true,
            },
          }),
        );
        break;

      case TaskVisibility.GROUP:
        createdTasks.push(
          await prisma.task.create({
            data: {
              visibility: result.data.visibility,
              assignmentLimit: result.data.assignmentLimit,
              title: result.data.title,
              description: result.data.description,
              createdBy: {
                connect: {
                  id: authentication.session.entity.id,
                },
              },
              expiresAt: result.data.expiresAt,
              rewardType: result.data.rewardType,
              rewardTypeTextValue: result.data.rewardTypeTextValue,
              rewardTypeSilcValue: result.data.rewardTypeSilcValue,
              rewardTypeNewSilcValue: result.data.rewardTypeNewSilcValue,
              assignments: {
                createMany: {
                  data:
                    result.data.assignedToIds!.map((id) => ({
                      citizenId: id,
                      createdById: authentication.session.entity!.id,
                    })) || [],
                },
              },
              repeatable: result.data.repeatable,
              canSelfComplete: result.data.canSelfComplete,
            },
            select: {
              id: true,
            },
          }),
        );
        break;

      case TaskVisibility.PERSONALIZED:
        createdTasks.push(
          ...(await prisma.$transaction([
            ...result.data.assignedToIds!.flatMap((assignedToId) => {
              return [
                prisma.task.create({
                  data: {
                    visibility: result.data.visibility,
                    assignmentLimit: result.data.assignmentLimit,
                    title: result.data.title,
                    description: result.data.description,
                    createdById: authentication.session.entity!.id,
                    expiresAt: result.data.expiresAt,
                    rewardType: result.data.rewardType,
                    rewardTypeTextValue: result.data.rewardTypeTextValue,
                    rewardTypeSilcValue: result.data.rewardTypeSilcValue,
                    rewardTypeNewSilcValue: result.data.rewardTypeNewSilcValue,
                    repeatable: result.data.repeatable,
                    assignments: {
                      create: {
                        citizenId: assignedToId,
                        createdById: authentication.session.entity!.id,
                      },
                    },
                    canSelfComplete: result.data.canSelfComplete,
                  },
                  select: {
                    id: true,
                  },
                }),
              ];
            }),
          ])),
        );
        break;

      default:
        return {
          error: t("Common.badRequest"),
          requestPayload: formData,
        };
    }

    /**
     * Trigger notifications
     */
    await triggerNotification("task_created", {
      taskIds: createdTasks.map((task) => task.id),
    });

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/tasks");

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
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
