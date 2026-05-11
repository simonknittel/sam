import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import clsx from "clsx";
import {
  createLoader,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getUsersWithEntities } from "../queries";
import { UsersTable } from "./UsersTable";

const loadSearchParams = createLoader({
  sortingBy: parseAsStringLiteral([
    "createdAt-desc",
    "createdAt-asc",
    "emailVerified-desc",
    "emailVerified-asc",
    "name-asc",
    "name-desc",
  ]).withDefault("createdAt-desc"),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const UsersTile = async ({ className, searchParams }: Props) => {
  const { sortingBy } = await loadSearchParams(searchParams);

  const users = await getUsersWithEntities();

  const sortedUsers = users.toSorted((a, b) => {
    switch (sortingBy) {
      case "createdAt-desc":
        return sortDescAndNullLast(a.user.createdAt, b.user.createdAt);
      case "createdAt-asc":
        return sortAscWithAndNullLast(a.user.createdAt, b.user.createdAt);
      case "emailVerified-desc":
        return sortDescAndNullLast(a.user.emailVerified, b.user.emailVerified);
      case "emailVerified-asc":
        return sortAscWithAndNullLast(
          a.user.emailVerified,
          b.user.emailVerified,
        );
      case "name-asc":
        return sortAscWithAndNullLast(a.user.name, b.user.name);
      case "name-desc":
        return sortDescAndNullLast(a.user.name, b.user.name);
      default:
        throw new Error(`Unknown sort: ${sortingBy satisfies never}`);
    }
  });

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <UsersTable users={sortedUsers} />
    </section>
  );
};
