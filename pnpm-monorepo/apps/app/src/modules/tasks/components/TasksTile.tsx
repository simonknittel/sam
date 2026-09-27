import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import clsx from "clsx";
import {
  parseAsStringEnum,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getTasks } from "../queries/getTasks";
import { TaskListStatus } from "../utils/TaskListStatus";
import { Task } from "./Task";

const loadSearchParams = createCursorPaginationLoader({
  status: parseAsStringEnum(Object.values(TaskListStatus)).withDefault(
    TaskListStatus.Open,
  ),
  accepted: parseAsStringLiteral(["all", "yes"]).withDefault("all"),
  created_by: parseAsStringLiteral(["others", "me"]).withDefault("others"),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const TasksTile = async ({ className, searchParams }: Props) => {
  const { status, accepted, created_by, cursor, direction } =
    await loadSearchParams(searchParams);

  const { tasks, newTaskIds, nextCursor, prevCursor } = await getTasks(
    status,
    accepted,
    created_by,
    cursor,
    direction,
  );

  if (tasks.length <= 0)
    return (
      <section className={clsx(className)}>
        <div className="rounded-primary bg-secondary p-4 text-center">
          <p>Keine Tasks gefunden</p>
        </div>
      </section>
    );

  return (
    <section className={clsx("flex flex-col gap-px", className)}>
      {tasks.map((task) => (
        <Task key={task.id} task={task} isNew={newTaskIds.has(task.id)} />
      ))}

      <CursorPaginationControls
        nextCursor={nextCursor}
        prevCursor={prevCursor}
        className="mt-4"
      />
    </section>
  );
};
