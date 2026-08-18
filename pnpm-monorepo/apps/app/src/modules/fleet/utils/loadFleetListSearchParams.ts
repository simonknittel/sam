import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

/** The URL filter contract shared by the my-ships and citizen fleet lists */
export const loadFleetListSearchParams = createCursorPaginationLoader({
  flight_ready: parseAsStringLiteral(["all", "flight_ready"]).withDefault(
    "all",
  ),
  sort: parseAsStringLiteral(["name-asc", "name-desc"]).withDefault("name-asc"),
  variantTags: parseAsArrayOf(parseAsString),
  manufacturerIds: parseAsArrayOf(parseAsString),
  showDeleted: parseAsStringLiteral(["all", "deleted"]).withDefault("all"),
  q: parseAsString,
});
