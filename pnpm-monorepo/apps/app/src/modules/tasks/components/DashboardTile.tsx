import { Link } from "@/modules/common/components/Link";
import { getNewIds } from "@/modules/read-markers/queries/getNewIds";
import { ReadMarkerSubject } from "@sam-monorepo/domain";
import clsx from "clsx";
import { getMyAssignedTasks } from "../queries/getMyAssignedTasks";
import { Task } from "./Task";

interface Props {
  readonly className?: string;
}

export const TasksDashboardTile = async ({ className }: Props) => {
  const myAssignedTasks = await getMyAssignedTasks();

  if (myAssignedTasks.length <= 0) return null;

  const newTaskIds = await getNewIds(
    ReadMarkerSubject.Task,
    myAssignedTasks.map((task) => task.id),
  );

  return (
    <section className={clsx(className)}>
      <h2 className="font-thin text-2xl self-start font-mono uppercase">
        Meine Tasks
      </h2>

      <div className="mt-2 flex flex-col gap-px">
        {myAssignedTasks.map((task) => (
          <Task key={task.id} task={task} isNew={newTaskIds.has(task.id)} />
        ))}
      </div>

      <div className="flex justify-center mt-2">
        <Link
          href="/app/tasks"
          className="text-interaction-500 hover:underline focus-visible:underline font-mono uppercase text-sm"
        >
          Alle Tasks
        </Link>
      </div>
    </section>
  );
};
