import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import clsx from "clsx";
import {
  createLoader,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getUsersWithEntities } from "../queries/getUsersWithEntities";
import { UsersTable } from "./UsersTable";

const loadSearchParams = createLoader({
  sort: parseAsStringLiteral([
    "createdAt-desc",
    "createdAt-asc",
    "emailVerified-desc",
    "emailVerified-asc",
    "name-asc",
    "name-desc",
  ]).withDefault("createdAt-desc"),
  q: parseAsString,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const UsersTile = async ({ className, searchParams }: Props) => {
  const { sort, q } = await loadSearchParams(searchParams);

  const users = await getUsersWithEntities();

  const filteredUsers = q
    ? users.filter((user) => {
        const searchQuery = q.toLowerCase();
        return user.entity?.handle?.toLowerCase().includes(searchQuery);
      })
    : users;

  const sortedUsers = filteredUsers.toSorted((a, b) => {
    switch (sort) {
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
        throw new Error(`Unknown sort: ${sort satisfies never}`);
    }
  });

  return (
    <section className={clsx("p-4 bg-secondary rounded-primary", className)}>
      <UsersTable users={sortedUsers} />
    </section>
  );
};
