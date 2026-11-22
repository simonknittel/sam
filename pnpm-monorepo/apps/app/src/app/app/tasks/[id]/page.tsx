import { requireAuthenticationPage } from "@/modules/auth/server";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { MarkAsReadOnMount } from "@/modules/read-markers/components/MarkAsReadOnMount";
import { TaskDetail } from "@/modules/tasks/components/TaskDetail";
import { getTaskById } from "@/modules/tasks/queries/getTaskById";
import {
  isAllowedToDeleteTask,
  isAllowedToManageTask,
} from "@/modules/tasks/utils/isAllowedToTask";
import { isTaskUpdatable } from "@/modules/tasks/utils/isTaskUpdatable";
import { getTaskStatus } from "@sam-monorepo/application";
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
      <TaskDetail
        task={task}
        status={getTaskStatus(task, new Date())}
        currentCitizenId={authentication.session.entity?.id ?? null}
        isAllowedToManageTask={await isAllowedToManageTask(task)}
        isAllowedToDeleteTask={await isAllowedToDeleteTask()}
        isTaskUpdatable={isTaskUpdatable(task)}
      />

      <MarkAsReadOnMount subject={ReadMarkerSubject.Task} subjectId={task.id} />
    </>
  );
}
