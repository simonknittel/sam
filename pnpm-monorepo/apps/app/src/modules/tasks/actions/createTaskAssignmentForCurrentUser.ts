"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { TaskVisibility } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import * as z from "zod";
import { requireOpenTask } from "../utils/requireOpenTask";

const schema = z.object({
  taskId: z.union([z.cuid(), z.cuid2()]),
});

export const createTaskAssignmentForCurrentUser = createAuthenticatedAction(
  "createTaskAssignmentForCurrentUser",
  schema,
  async (formData, authentication, data, t) => {
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const { task, failure } = await requireOpenTask(data.taskId, formData);
    if (failure) return failure;

    if (
      task.visibility === TaskVisibility.PERSONALIZED ||
      task.visibility === TaskVisibility.GROUP
    )
      return {
        error:
          "Du kannst deine Teilnahme an einem personalisierten Task nicht selbstständig ändern.",
        requestPayload: formData,
      };

    if (
      task.assignmentLimit &&
      task.assignments.length >= task.assignmentLimit
    ) {
      /** The page then shows the citizens who took the last places */
      refresh();

      return {
        error: "Dieser Task kann nicht von Weiteren angenommen werden.",
        requestPayload: formData,
      };
    }

    if (!task.hasCurrentUserRequiredRole)
      return {
        error: "Du erfüllst nicht die Voraussetzungen für diesen Task.",
        requestPayload: formData,
      };

    /**
     * Create
     */
    try {
      await prisma.taskAssignment.create({
        data: {
          task: {
            connect: {
              id: data.taskId,
            },
          },
          citizen: {
            connect: {
              id: authentication.session.entity.id,
            },
          },
        },
      });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed)) {
        /**
         * A different tab took the task on before, and the page must show it
         */
        refresh();
        return {
          error: "Du hast diesen Task bereits angenommen.",
          requestPayload: formData,
        };
      }
      throw error;
    }

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.TASK_SELF_ASSIGNMENT_CREATED,
        data: {
          taskId: task.id,
          citizenId: authentication.session.entity.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
