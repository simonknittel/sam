"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { createSilcTransactions } from "@/modules/silc/utils/createSilcTransactions";
import { createId } from "@paralleldrive/cuid2";
import { TaskRewardType, TaskVisibility } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTaskById } from "../queries/getTaskById";
import { isAllowedToManageTask } from "../utils/isAllowedToTask";
import { isTaskUpdatable } from "../utils/isTaskUpdatable";

const schema = z.object({
  id: z.union([z.cuid(), z.cuid2()]),
  completionistIds: z.array(z.cuid()).max(250), // Arbitrary (untested) limit to prevent DDoS
});

export const completeTask = createAuthenticatedAction(
  "completeTask",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Authorize the request
     */
    const task = await getTaskById(data.id);
    if (!task)
      return { error: "Task nicht gefunden", requestPayload: formData };
    if (!isTaskUpdatable(task))
      return {
        error: "Der Task ist bereits abgeschlossen.",
        requestPayload: formData,
      };
    const isAllowedToManage = await isAllowedToManageTask(task);
    const isAllowedToSelfComplete =
      task.canSelfComplete &&
      task.assignments.some(
        (assignment) =>
          assignment.citizenId === authentication.session.entity!.id,
      );
    if (!isAllowedToManage && !isAllowedToSelfComplete)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    // Deduplicated since each completionist may receive the reward only once
    const completionistIds = [...new Set(data.completionistIds)];

    // Managers may credit anyone, self-completers only the task's actual assignees
    if (!isAllowedToManage) {
      const assigneeIds = new Set(
        task.assignments.map((assignment) => assignment.citizenId),
      );
      if (
        completionistIds.some(
          (completionistId) => !assigneeIds.has(completionistId),
        )
      )
        return {
          error: t("Common.forbidden"),
          requestPayload: formData,
        };
    }

    if (completionistIds.length <= 0)
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
        id: data.id,
      },
      data: {
        completedAt: new Date(),
        completedBy: {
          connect: {
            id: authentication.session.entity.id,
          },
        },
        completionists: {
          connect: completionistIds.map((id) => ({
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
      const rewardValue =
        task.rewardType === TaskRewardType.SILC
          ? task.rewardTypeSilcValue!
          : task.rewardTypeNewSilcValue!;

      await createSilcTransactions([
        ...completionistIds.map((receiverId) => ({
          receiverId,
          value: rewardValue,
          description: `Task erfüllt: ${task.title}`,
          createdById: authentication.session.entity!.id,
        })),

        // With the SILC reward type the task's creator funds the reward
        ...(task.rewardType === TaskRewardType.SILC && task.createdById
          ? [
              {
                receiverId: task.createdById,
                value: -(task.rewardTypeSilcValue! * completionistIds.length),
                description: `Task abgeschlossen: ${task.title}`,
                createdById: authentication.session.entity.id,
              },
            ]
          : []),
      ]);

      /**
       * Revalidate cache(s)
       */
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
                        !completionistIds.includes(assignment.citizenId),
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

    await createAuditEvents([
      {
        type: AuditEventType.TASK_COMPLETED,
        data: {
          taskId: task.id,
          completionistIds,
          rewardType: task.rewardType,
        },
        createdById: authentication.session.user.id,
      },
    ]);

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
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      completionistIds: formData.getAll("completionistId[]"),
    }),
  },
);
