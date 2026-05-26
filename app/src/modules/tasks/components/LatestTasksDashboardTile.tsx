import { Link } from "@/modules/common/components/Link";
import clsx from "clsx";
import { getLatestVisibleTasks } from "../queries/getLatestVisibleTasks";
import { Task } from "./Task";

interface Props {
  readonly className?: string;
}

export const LatestTasksDashboardTile = async ({ className }: Props) => {
  const latestTasks = await getLatestVisibleTasks();

  if (latestTasks.length <= 0) return null;

  return (
    <section className={clsx(className)}>
      <h2 className="font-thin text-2xl self-start font-mono uppercase">
        Neue Tasks
      </h2>

      <div className="mt-2 flex flex-col gap-px">
        {latestTasks.map((task) => (
          <Task key={task.id} task={task} />
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
