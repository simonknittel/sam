import clsx from "clsx";
import type { ReactNode } from "react";
import { Table, TBody, THead } from "./Table";
import { Tile } from "./Tile";

export interface TableColumn {
  readonly key: string;
  readonly label: ReactNode;
  /** Grid track for this column, e.g. `"150px"` or `"minmax(280px,1fr)"`. */
  readonly track: string;
  /** Width in pixels this column never falls below; the table scrolls instead. */
  readonly minWidth: number;
  readonly headerClassName?: string;
}

/** Matches the `gap-2` the table's head and rows lay their cells out with. */
const COLUMN_GAP = 8;

interface Props {
  readonly className?: string;
  readonly heading?: ReactNode;
  readonly cta?: ReactNode;
  readonly columns: readonly TableColumn[];
  readonly isEmpty: boolean;
  readonly emptyMessage: ReactNode;
  readonly bodyClassName?: string;
  /** Rendered below the tile, e.g. pagination controls or a footnote. */
  readonly footer?: ReactNode;
  /** The `TRow`s of the table. */
  readonly children: ReactNode;
}

/**
 * The content half of a table page: tile chrome, the column definition, the
 * empty state and room for pagination below. Hosts both a `SidebarLayout`'s
 * content column and a table sitting among other tiles on a page.
 */
export const TableTile = ({
  className,
  heading,
  cta,
  columns,
  isEmpty,
  emptyMessage,
  bodyClassName,
  footer,
  children,
}: Props) => {
  const minWidth =
    columns.reduce((total, column) => total + column.minWidth, 0) +
    COLUMN_GAP * Math.max(columns.length - 1, 0);

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      <Tile heading={heading} cta={cta}>
        {isEmpty ? (
          <p className="text-neutral-500">{emptyMessage}</p>
        ) : (
          <Table
            columns={columns.map((column) => column.track).join(" ")}
            minWidth={minWidth}
          >
            <THead>
              {columns.map((column) => (
                <th key={column.key} className={column.headerClassName}>
                  {column.label}
                </th>
              ))}
            </THead>

            <TBody className={bodyClassName}>{children}</TBody>
          </Table>
        )}
      </Tile>

      {footer}
    </div>
  );
};
