"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { triggerNotifications } from "@/modules/notifications/utils/triggerNotification";
import {
  TaskRewardType,
  TaskVisibility,
  type Task,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TASK_DESCRIPTION_MAX_LENGTH } from "../utils/taskConstraints";

const schema = z.object({
  visibility: z.enum(TaskVisibility),
  assignmentLimit: z.coerce.number().min(1).nullable(),
  assignedToIds: z.array(z.cuid()).max(250).optional(), // Arbitrary (untested) limit to prevent DDoS
  title: z.string().trim().max(64),
  description: z.string().trim().max(TASK_DESCRIPTION_MAX_LENGTH).optional(),
  expiresAt: z.coerce.date().optional(),
  rewardType: z.enum(TaskRewardType),
  rewardTypeTextValue: z.string().trim().max(2048).optional(),
  rewardTypeSilcValue: z.coerce.number().optional(),
  rewardTypeNewSilcValue: z.coerce.number().optional(),
  repeatable: z.coerce.number().min(1),
  requiredRoles: z.array(z.cuid()).max(50).optional(), // Arbitrary (untested) limit to prevent DDoS
  hiddenForOtherRoles: z.coerce.boolean().optional(),
  canSelfComplete: z.coerce.boolean().optional(),
});

export const createTask = createAuthenticatedAction(
  "createTask",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("task", "create")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Authorize the request
     */
    if (
      (data.visibility === TaskVisibility.PERSONALIZED ||
        data.visibility === TaskVisibility.GROUP) &&
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
      data.rewardType === TaskRewardType.NEW_SILC &&
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
    switch (data.visibility) {
      case TaskVisibility.PUBLIC:
        createdTasks.push(
          await prisma.task.create({
            data: {
              visibility: data.visibility,
              assignmentLimit: data.assignmentLimit,
              title: data.title,
              description: data.description,
              createdBy: {
                connect: {
                  id: authentication.session.entity.id,
                },
              },
              expiresAt: data.expiresAt,
              rewardType: data.rewardType,
              rewardTypeTextValue: data.rewardTypeTextValue,
              rewardTypeSilcValue: data.rewardTypeSilcValue,
              rewardTypeNewSilcValue: data.rewardTypeNewSilcValue,
              repeatable: data.repeatable,
              requiredRoles: {
                connect: data.requiredRoles
                  ? data.requiredRoles.map((roleId) => ({
                      id: roleId,
                    }))
                  : [],
              },
              hiddenForOtherRoles: data.hiddenForOtherRoles,
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
              visibility: data.visibility,
              assignmentLimit: data.assignmentLimit,
              title: data.title,
              description: data.description,
              createdBy: {
                connect: {
                  id: authentication.session.entity.id,
                },
              },
              expiresAt: data.expiresAt,
              rewardType: data.rewardType,
              rewardTypeTextValue: data.rewardTypeTextValue,
              rewardTypeSilcValue: data.rewardTypeSilcValue,
              rewardTypeNewSilcValue: data.rewardTypeNewSilcValue,
              assignments: {
                createMany: {
                  data:
                    data.assignedToIds!.map((id) => ({
                      citizenId: id,
                      createdById: authentication.session.entity!.id,
                    })) || [],
                },
              },
              repeatable: data.repeatable,
              canSelfComplete: data.canSelfComplete,
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
            ...data.assignedToIds!.flatMap((assignedToId) => {
              return [
                prisma.task.create({
                  data: {
                    visibility: data.visibility,
                    assignmentLimit: data.assignmentLimit,
                    title: data.title,
                    description: data.description,
                    createdById: authentication.session.entity!.id,
                    expiresAt: data.expiresAt,
                    rewardType: data.rewardType,
                    rewardTypeTextValue: data.rewardTypeTextValue,
                    rewardTypeSilcValue: data.rewardTypeSilcValue,
                    rewardTypeNewSilcValue: data.rewardTypeNewSilcValue,
                    repeatable: data.repeatable,
                    assignments: {
                      create: {
                        citizenId: assignedToId,
                        createdById: authentication.session.entity!.id,
                      },
                    },
                    canSelfComplete: data.canSelfComplete,
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

    await createAuditEvents([
      {
        type: AuditEventType.TASK_CREATED,
        data: {
          taskIds: createdTasks.map((task) => task.id),
          visibility: data.visibility,
          rewardType: data.rewardType,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Trigger notifications
     */
    await triggerNotifications([
      {
        type: "TaskCreated",
        payload: {
          taskIds: createdTasks.map((task) => task.id),
        },
      },
    ]);

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
  },
  {
    parseFormData: (formData) => ({
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
    }),
  },
);
