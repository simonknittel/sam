import { requireAuthenticationPage } from "@/modules/auth/server";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { MarkAsReadOnMount } from "@/modules/read-markers/components/MarkAsReadOnMount";
import { Overview } from "@/modules/tasks/components/Overview";
import { getTaskById } from "@/modules/tasks/queries/getTaskById";
import {
  isAllowedToDeleteTask,
  isAllowedToManageTask,
} from "@/modules/tasks/utils/isAllowedToTask";
import { isTaskUpdatable } from "@/modules/tasks/utils/isTaskUpdatable";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import { notFound } from "next/navigation";

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: PageProps<"/app/tasks/[id]">) => {
    const task = await getTaskById((await props.params).id);
    if (!task) notFound();

    return {
      title: task.title,
    };
  },
);

export default async function Page({ params }: PageProps<"/app/tasks/[id]">) {
  const authentication = await requireAuthenticationPage("/app/tasks/[id]");
  await authentication.authorizePage("task", "read");

  const task = await getTaskById((await params).id);
  if (!task) notFound();

  return (
    <>
      <Overview
        task={{
          id: task.id,
          title: task.title,
          description: task.description,
          visibility: task.visibility,
          assignmentLimit: task.assignmentLimit,
          canSelfComplete: task.canSelfComplete,
          hiddenForOtherRoles: task.hiddenForOtherRoles,
          repeatable: task.repeatable,
          rewardType: task.rewardType,
          rewardSilcValue: task.rewardSilcValue,
          rewardTypeTextValue: task.rewardTypeTextValue,
          createdAt: task.createdAt,
          expiresAt: task.expiresAt,
          createdBy: task.createdBy,
          assignments: task.assignments,
          completionists: task.completionists,
          requiredRoles: task.requiredRoles,
          hasCurrentUserRequiredRole: task.hasCurrentUserRequiredRole,
        }}
        isAllowedToManageTask={await isAllowedToManageTask(task)}
        isAllowedToDeleteTask={await isAllowedToDeleteTask()}
        isTaskUpdatable={isTaskUpdatable(task)}
      />

      <MarkAsReadOnMount subject={ReadMarkerSubject.Task} subjectId={task.id} />
    </>
  );
}
