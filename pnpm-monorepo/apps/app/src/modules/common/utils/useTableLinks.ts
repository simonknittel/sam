import { usePathname } from "next/navigation";
import { useQueryStates, type ParserMap, type Values } from "nuqs";

/**
 * The search parameters of a table and the links to the table with other
 * search parameters, for example the page links and the sort links.
 *
 * The values come from nuqs, thus a link includes a filter change of
 * `FilterCheckboxList` immediately. A link from the server render includes
 * the change only after the server renders the table again, and a click on
 * the link before that removes the new filter.
 */
export const useTableLinks = <Parsers extends ParserMap>(
  parsers: Parsers,
  /** The `createSerializer` function of the same parsers */
  serialize: (base: string, values: Partial<Values<Parsers>>) => string,
) => {
  const pathname = usePathname();
  const [searchParameters] = useQueryStates(parsers);

  const getHref = (values: Partial<Values<Parsers>>) =>
    serialize(pathname, { ...searchParameters, ...values });

  return { searchParameters, getHref };
};
