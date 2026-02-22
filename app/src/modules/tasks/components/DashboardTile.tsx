import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { getMyAssignedTasks } from "../queries";
import { Task } from "./Task";

interface Props {
  readonly className?: string;
}

export const TasksDashboardTile = async ({ className }: Props) => {
  const myAssignedTasks = await getMyAssignedTasks();

  if (myAssignedTasks.length <= 0) return null;

  return (
    <section className={clsx(className)}>
      <h2 className="font-thin text-2xl self-start font-mono uppercase">
        Meine Tasks
      </h2>

      <div className="mt-2 flex flex-col gap-[1px]">
        {myAssignedTasks.map((task) => (
          <Task key={task.id} task={task} />
        ))}
      </div>

      <div className="flex justify-center mt-1">
        <Link
          href="/app/tasks"
          className="text-interaction-500 hover:underline focus-visible:underline"
        >
          Alle Tasks
        </Link>
      </div>
    </section>
  );
};
