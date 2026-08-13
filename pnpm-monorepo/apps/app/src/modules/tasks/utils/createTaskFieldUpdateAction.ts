import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import type { Prisma, Task } from "@sam-monorepo/database/client";
import type {
  AuditEventDataByType,
  AuditEventType,
} from "@sam-monorepo/domain";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import {
  requireManageableTask,
  type ManageableTask,
} from "./requireManageableTask";

type TaskFieldAuditEvent = {
  [Key in AuditEventType]: {
    type: Key;
    data: AuditEventDataByType[Key];
  };
}[AuditEventType];

interface Configuration<Schema extends z.ZodType<{ id: Task["id"] }>> {
  readonly update: (data: z.output<Schema>) => Prisma.TaskUpdateInput;
  readonly auditEvent: (
    task: ManageableTask,
    data: z.output<Schema>,
  ) => TaskFieldAuditEvent;
  readonly parseFormData?: (formData: FormData) => unknown;
}

/**
 * Factory for the single-field task update actions, which only differ in
 * their schema, the updated column and the emitted audit event. The shared
 * body guards via `requireManageableTask`, updates the task, writes the
 * audit event and revalidates the task pages.
 */
export const createTaskFieldUpdateAction = <
  Schema extends z.ZodType<{ id: Task["id"] }>,
>(
  actionName: string,
  schema: Schema,
  configuration: Configuration<Schema>,
) =>
  createAuthenticatedAction(
    actionName,
    schema,
    async (formData, authentication, data, t) => {
      const { task, failure } = await requireManageableTask(
        data.id,
        formData,
        t,
      );
      if (failure) return failure;

      await prisma.task.update({
        where: { id: data.id },
        data: configuration.update(data),
      });

      await createAuditEvents([
        {
          ...configuration.auditEvent(task, data),
          createdById: authentication.session.user.id,
        },
      ]);

      revalidatePath("/app/tasks");
      revalidatePath(`/app/tasks/${task.id}`);

      return {
        success: t("Common.successfullySaved"),
      };
    },
    configuration.parseFormData
      ? { parseFormData: configuration.parseFormData }
      : undefined,
  );
