"use client";

import { autoUpdate } from "@floating-ui/react-dom";
import type { ChainedCommands } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { useEffect, useState, type RefObject } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

interface TableControlsTarget {
  /** Resolves cells for the commands at click time */
  readonly table: HTMLTableElement;
  /** x offsets of the column boundaries (cols + 1), relative to the overlay */
  readonly columnBoundaries: readonly number[];
  /** x offsets of the column centers, relative to the overlay */
  readonly columnCenters: readonly number[];
  /** y offsets of the row boundaries (rows + 1), relative to the overlay */
  readonly rowBoundaries: readonly number[];
  /** y offsets of the row centers, relative to the overlay */
  readonly rowCenters: readonly number[];
  /** Table edges, relative to the overlay */
  readonly top: number;
  readonly left: number;
}

interface Props {
  readonly editor: Editor | null;
  /** The overlay root — reference frame for the button positions */
  readonly overlayRef: RefObject<HTMLDivElement | null>;
}

/**
 * Row/column controls for the table the cursor is in: plus buttons on the
 * column boundaries along the top edge and the row boundaries along the
 * left edge insert a column/row there; trash buttons on the column/row
 * centers delete that column/row. They follow the selection rather than
 * the focused block, because clicking a cell focuses the paragraph inside
 * it — the deepest block, as everywhere else.
 */
export const WikiTableControls = ({ editor, overlayRef }: Props) => {
  const [target, setTarget] = useState<TableControlsTarget | null>(null);

  useEffect(() => {
    if (!editor) return;
    let stopMeasuring: (() => void) | null = null;

    const update = () => {
      stopMeasuring?.();
      stopMeasuring = null;

      const overlay = overlayRef.current;
      if (!overlay || editor.isDestroyed) {
        setTarget(null);
        return;
      }

      if (!editor.isActive("table")) {
        setTarget(null);
        return;
      }

      const domAtPos = editor.view.domAtPos(editor.state.selection.from).node;
      const element =
        domAtPos instanceof HTMLElement ? domAtPos : domAtPos.parentElement;
      const table = element?.closest("table");
      if (
        !(table instanceof HTMLTableElement) ||
        !editor.view.dom.contains(table)
      ) {
        setTarget(null);
        return;
      }

      const measure = () => {
        const rows = Array.from(table.rows);
        /**
         * The row with the most cells defines the column geometry — rows
         * with merged cells would report too few boundaries.
         */
        const referenceRow = rows.reduce<HTMLTableRowElement | null>(
          (longest, row) =>
            !longest || row.cells.length > longest.cells.length ? row : longest,
          null,
        );
        const cells = referenceRow ? Array.from(referenceRow.cells) : [];
        if (rows.length === 0 || cells.length === 0) {
          setTarget(null);
          return;
        }

        const overlayRect = overlay.getBoundingClientRect();
        const tableRect = table.getBoundingClientRect();
        const columnBoundaries = [
          cells[0].getBoundingClientRect().left,
          ...cells.map((cell) => cell.getBoundingClientRect().right),
        ].map((x) => x - overlayRect.left);
        const rowBoundaries = [
          rows[0].getBoundingClientRect().top,
          ...rows.map((row) => row.getBoundingClientRect().bottom),
        ].map((y) => y - overlayRect.top);
        const centers = (boundaries: readonly number[]) =>
          boundaries
            .slice(1)
            .map((boundary, index) => (boundaries[index] + boundary) / 2);

        setTarget({
          table,
          columnBoundaries,
          columnCenters: centers(columnBoundaries),
          rowBoundaries,
          rowCenters: centers(rowBoundaries),
          top: tableRect.top - overlayRect.top,
          left: tableRect.left - overlayRect.left,
        });
      };

      /** Keeps the positions fresh on scroll, resize and layout shifts */
      stopMeasuring = autoUpdate(table, overlay, measure);
    };

    // eslint-disable-next-line react-you-might-not-need-an-effect/no-external-store-subscription -- The tiptap editor is an imperative external store; its event API is the only way to mirror its state.
    update();
    editor.on("transaction", update);
    return () => {
      stopMeasuring?.();
      editor.off("transaction", update);
    };
  }, [editor, overlayRef]);

  if (!editor || !target) return null;

  /**
   * The commands work on the cell the selection sits in — place the cursor
   * into a reference cell of the affected row/column first. Indices clamp
   * so merged cells at most shift the target, never miss the table.
   */
  const runOnCell = (
    rowIndex: number,
    columnIndex: number,
    command: (chain: ChainedCommands) => ChainedCommands,
  ) => {
    const { table } = target;
    if (!table.isConnected) return;
    const row = table.rows.item(Math.min(rowIndex, table.rows.length - 1));
    if (!row || row.cells.length === 0) return;
    const cell = row.cells.item(Math.min(columnIndex, row.cells.length - 1));
    if (!cell) return;

    let position: number;
    try {
      position = editor.view.posAtDOM(cell, 0);
    } catch {
      return;
    }
    command(
      editor
        .chain()
        .focus()
        .setTextSelection(position + 1),
    ).run();
  };

  const insertColumn = (boundary: number) => {
    runOnCell(0, Math.max(boundary - 1, 0), (chain) =>
      boundary === 0 ? chain.addColumnBefore() : chain.addColumnAfter(),
    );
  };

  const deleteColumn = (column: number) => {
    runOnCell(0, column, (chain) => chain.deleteColumn());
  };

  const insertRow = (boundary: number) => {
    runOnCell(boundary - 1, 0, (chain) => chain.addRowAfter());
  };

  const deleteRow = (row: number) => {
    runOnCell(row, 0, (chain) => chain.deleteRow());
  };

  const columnCount = target.columnCenters.length;
  const rowCount = target.rowCenters.length;

  return (
    <>
      {target.columnBoundaries.map((x, boundary) => (
        <ControlButton
          key={`add-column-${boundary}`}
          title="Spalte einfügen"
          variant="insert"
          left={x}
          top={target.top}
          onClick={() => insertColumn(boundary)}
        />
      ))}
      {columnCount > 1 &&
        target.columnCenters.map((x, column) => (
          <ControlButton
            key={`delete-column-${column}`}
            title="Spalte löschen"
            variant="delete"
            left={x}
            top={target.top}
            onClick={() => deleteColumn(column)}
          />
        ))}
      {/*
        No button above the first row: inserting there would put a body row
        above the header row (prosemirror-tables inserts plain cells), and
        it would collide with the first column boundary button in the
        corner.
      */}
      {target.rowBoundaries.slice(1).map((y, index) => (
        <ControlButton
          key={`add-row-${index}`}
          title="Zeile einfügen"
          variant="insert"
          left={target.left}
          top={y}
          onClick={() => insertRow(index + 1)}
        />
      ))}
      {rowCount > 1 &&
        target.rowCenters.map((y, row) => (
          <ControlButton
            key={`delete-row-${row}`}
            title="Zeile löschen"
            variant="delete"
            left={target.left}
            top={y}
            onClick={() => deleteRow(row)}
          />
        ))}
    </>
  );
};

interface ControlButtonProps {
  readonly title: string;
  readonly variant: "insert" | "delete";
  /** Button center, relative to the overlay */
  readonly left: number;
  readonly top: number;
  readonly onClick: () => void;
}

/**
 * The invisible p-1 padding enlarges the click target. No z-index: the
 * sticky editor toolbar (z-10) must cover the buttons when the table
 * scrolls underneath it — in exchange the edit menu (z-20) wins where the
 * two overlap.
 */
const ControlButton = ({
  title,
  variant,
  left,
  top,
  onClick,
}: ControlButtonProps) => {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="group pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center p-1"
      style={{ left, top }}
    >
      <span
        className={clsx(
          "flex size-5 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 shadow-lg",
          variant === "insert"
            ? "group-hover:border-interaction-500 group-hover:text-interaction-500"
            : "group-hover:border-red-500 group-hover:text-red-500",
        )}
      >
        {variant === "insert" ? (
          <FaPlus className="size-2.5" />
        ) : (
          <FaTrash className="size-2.5" />
        )}
      </span>
    </button>
  );
};
