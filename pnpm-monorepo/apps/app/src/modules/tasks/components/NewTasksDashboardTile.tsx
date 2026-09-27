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
      <h2 className="font-thin text-2xl self-start font-mono uppercase">
        Neue Tasks
      </h2>

      <div className="mt-2 flex flex-col gap-px">
        {newTasks.map((task) => (
          <Task key={task.id} task={task} isNew />
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
