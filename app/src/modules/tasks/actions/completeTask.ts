"use server";

import { prisma } from "@/db";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { updateCitizensSilcBalances } from "@/modules/silc/utils/updateCitizensSilcBalances";
import { createId } from "@paralleldrive/cuid2";
import { TaskRewardType, TaskVisibility } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { getTaskById } from "../queries";
import { isAllowedToManageTask } from "../utils/isAllowedToTask";
import { isTaskUpdatable } from "../utils/isTaskUpdatable";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  completionistIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
});

export const completeTask = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction("completeTask");
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      id: formData.get("id"),
      completionistIds: formData.getAll("completionistId[]"),
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
    const task = await getTaskById(result.data.id);
    if (!task)
      return { error: "Task nicht gefunden", requestPayload: formData };
    if (!isTaskUpdatable(task))
      return {
        error: "Der Task ist bereits abgeschlossen.",
        requestPayload: formData,
      };
    const isAllowedToSelfComplete =
      task.canSelfComplete &&
      task.assignments.some(
        (assignment) =>
          assignment.citizenId === authentication.session.entity!.id,
      );
    if (!(await isAllowedToManageTask(task)) && !isAllowedToSelfComplete)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    if (result.data.completionistIds.length <= 0)
      return {
        error:
          "Der Task kann nicht abgeschlossen werden, ohne dass ihn jemand erfüllt hat.",
        requestPayload: formData,
      };

    /**
     * Update
     */
    await prisma.task.update({
      where: {
        id: result.data.id,
      },
      data: {
        completedAt: new Date(),
        completedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
        completionists: {
          connect: result.data.completionistIds.map((id) => ({
            id,
          })),
        },
      },
    });

    /**
     * Create SILC transaction
     */
    if (
      task.rewardType === TaskRewardType.SILC ||
      task.rewardType === TaskRewardType.NEW_SILC
    ) {
      if (task.rewardType === TaskRewardType.SILC) {
        await prisma.$transaction([
          prisma.silcTransaction.createMany({
            data: result.data.completionistIds.map((receiverId) => ({
              receiverId,
              value: task.rewardTypeSilcValue!,
              description: `Task erfüllt: ${task.title}`,
              createdById: authentication.session.entity!.id,
            })),
          }),

          ...(task.createdById
            ? [
                prisma.silcTransaction.create({
                  data: {
                    receiverId: task.createdById,
                    value: -(
                      task.rewardTypeSilcValue! *
                      result.data.completionistIds.length
                    ),
                    description: `Task abgeschlossen: ${task.title}`,
                    createdById: authentication.session.entity.id,
                  },
                }),
              ]
            : []),
        ]);

        /**
         * Update citizens' balances
         */
        if (task.createdById)
          await updateCitizensSilcBalances([task.createdById]);
      } else if (task.rewardType === TaskRewardType.NEW_SILC) {
        await prisma.silcTransaction.createMany({
          data: result.data.completionistIds.map((receiverId) => ({
            receiverId,
            value: task.rewardTypeNewSilcValue!,
            description: `Task erfüllt: ${task.title}`,
            createdById: authentication.session.entity!.id,
          })),
        });
      }

      /**
       * Update citizens' balances
       */
      await updateCitizensSilcBalances(result.data.completionistIds);

      /**
       * Revalidate cache(s)
       */
      revalidatePath("/app/silc");
      revalidatePath("/app/silc/transactions");
      revalidatePath("/app/dashboard");
      revalidatePath("/app/spynet/citizen/[id]/silc");
    }

    if (task.repeatable && task.repeatable > 1) {
      /**
       * Create task
       */
      switch (task.visibility) {
        case TaskVisibility.PUBLIC:
          await prisma.task.create({
            data: {
              visibility: task.visibility,
              assignmentLimit: task.assignmentLimit,
              title: task.title,
              description: task.description,
              createdBy: {
                connect: {
                  id: authentication.session.entity.id,
                },
              },
              expiresAt: task.expiresAt,
              rewardType: task.rewardType,
              rewardTypeTextValue: task.rewardTypeTextValue,
              rewardTypeSilcValue: task.rewardTypeSilcValue,
              rewardTypeNewSilcValue: task.rewardTypeNewSilcValue,
              assignments: {
                createMany: {
                  data: task.assignments
                    .filter(
                      (assignment) =>
                        !result.data.completionistIds.includes(
                          assignment.citizenId,
                        ),
                    )
                    .map((assignment) => ({
                      citizenId: assignment.citizenId,
                      createdById: authentication.session.entity!.id,
                    })),
                },
              },
              repeatable: task.repeatable - 1,
              requiredRoles: {
                connect: task.requiredRoles.map((role) => ({
                  id: role.id,
                })),
              },
              hiddenForOtherRoles: task.hiddenForOtherRoles,
            },
          });
          break;

        case TaskVisibility.GROUP:
          await prisma.task.create({
            data: {
              visibility: task.visibility,
              assignmentLimit: task.assignmentLimit,
              title: task.title,
              description: task.description,
              createdBy: {
                connect: {
                  id: authentication.session.entity.id,
                },
              },
              expiresAt: task.expiresAt,
              rewardType: task.rewardType,
              rewardTypeTextValue: task.rewardTypeTextValue,
              rewardTypeSilcValue: task.rewardTypeSilcValue,
              rewardTypeNewSilcValue: task.rewardTypeNewSilcValue,
              assignments: {
                createMany: {
                  data: task.assignments.map((assignment) => ({
                    citizenId: assignment.citizenId,
                    createdById: authentication.session.entity!.id,
                  })),
                },
              },
              repeatable: task.repeatable - 1,
              canSelfComplete: task.canSelfComplete,
            },
          });
          break;

        case TaskVisibility.PERSONALIZED:
          await prisma.$transaction([
            ...task.assignments.flatMap((assignment) => {
              const id = createId();
              return [
                prisma.task.create({
                  data: {
                    id,
                    visibility: task.visibility,
                    assignmentLimit: task.assignmentLimit,
                    title: task.title,
                    description: task.description,
                    createdById: authentication.session.entity!.id,
                    expiresAt: task.expiresAt,
                    rewardType: task.rewardType,
                    rewardTypeTextValue: task.rewardTypeTextValue,
                    rewardTypeSilcValue: task.rewardTypeSilcValue,
                    rewardTypeNewSilcValue: task.rewardTypeNewSilcValue,
                    repeatable: task.repeatable - 1,
                    canSelfComplete: task.canSelfComplete,
                  },
                }),

                prisma.taskAssignment.create({
                  data: {
                    taskId: id,
                    citizenId: assignment.citizenId,
                    createdById: authentication.session.entity!.id,
                  },
                }),
              ];
            }),
          ]);
          break;

        default:
          return {
            error: t("Common.badRequest"),
            requestPayload: formData,
          };
      }
    }

    /**
     * Revalidate cache(s)
     */
    revalidatePath("/app/tasks");
    revalidatePath(`/app/tasks/${task.id}`);

    /**
     * Respond with the result
     */
    return {
      success: "Erfolgreich abgeschlossen.",
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
