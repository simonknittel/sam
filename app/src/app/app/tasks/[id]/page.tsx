import { requireAuthenticationPage } from "@/modules/auth/server";
import { generateMetadataWithTryCatch } from "@/modules/common/utils/generateMetadataWithTryCatch";
import { Overview } from "@/modules/tasks/components/Overview";
import { getTaskById } from "@/modules/tasks/queries";
import {
  isAllowedToDeleteTask,
  isAllowedToManageTask,
} from "@/modules/tasks/utils/isAllowedToTask";
import { isTaskUpdatable } from "@/modules/tasks/utils/isTaskUpdatable";
import { notFound } from "next/navigation";

type Params = Promise<{
  id: string;
}>;

export const generateMetadata = generateMetadataWithTryCatch(
  async (props: { params: Params }) => {
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
    <Overview
      task={task}
      isAllowedToManageTask={await isAllowedToManageTask(task)}
      isAllowedToDeleteTask={await isAllowedToDeleteTask()}
      isTaskUpdatable={isTaskUpdatable(task)}
    />
  );
}
