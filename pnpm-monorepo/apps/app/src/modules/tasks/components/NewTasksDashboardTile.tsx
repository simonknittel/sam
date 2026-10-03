import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { getNewTasksForDashboard } from "../queries/getNewTasksForDashboard";
import { Task } from "./Task";

interface Props {
  readonly className?: string;
}

export const NewTasksDashboardTile = async ({ className }: Props) => {
  const newTasks = await getNewTasksForDashboard();

  if (newTasks.length <= 0) return null;

  return (
    <section className={clsx(className)}>
      <h2 className="self-start font-mono text-2xl font-thin uppercase">
        Neue Tasks
      </h2>

      <div className="mt-2 flex flex-col gap-px">
        {newTasks.map((task) => (
          <Task key={task.id} task={task} isNew />
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
