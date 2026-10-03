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
      <h2 className="self-start font-mono text-2xl font-thin uppercase">
        Meine Tasks
      </h2>

      <div className="mt-2 flex flex-col gap-px">
        {myAssignedTasks.map((task) => (
          <Task key={task.id} task={task} isNew={newTaskIds.has(task.id)} />
        ))}
      </div>

      <div className="mt-2 flex justify-center">
        <Link
          href="/app/tasks"
          className="font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline"
        >
          Alle Tasks
        </Link>
      </div>
    </section>
  );
};
