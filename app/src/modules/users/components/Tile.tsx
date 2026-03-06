import clsx from "clsx";
import { getUsersWithEntities } from "../queries";
import { Table } from "./Table";

interface Props {
  readonly className?: string;
}

export const Tile = async ({ className }: Props) => {
  const users = await getUsersWithEntities();

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <Table users={users} />
    </section>
  );
};
