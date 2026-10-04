"use client";

import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Active,
  type DndContextProps,
  type Over,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  hasSortableData,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useMemo } from "react";

/**
 * Give these attributes to `useSortable()`. Screen readers then call the
 * handle "Ziehgriff" and not "sortable".
 */
export const SORTABLE_HANDLE_ATTRIBUTES = { roleDescription: "Ziehgriff" };

/**
 * The pointer must move this number of pixels before a drag starts. Thus a
 * click on a handle, a link or a button in the row stays a click.
 */
const POINTER_ACTIVATION_DISTANCE = 8;

const describePosition = (entry: Active | Over) => {
  if (!hasSortableData(entry)) return "an einer unbekannten Position";

  const { index, items } = entry.data.current.sortable;
  return `auf Position ${index + 1} von ${items.length}`;
};

const createAccessibility = (
  getName: (id: UniqueIdentifier) => string,
): NonNullable<DndContextProps["accessibility"]> => {
  /**
   * Right after the pickup, dnd-kit tells that the entry is over itself. That
   * message would replace the pickup message before a screen reader reads it,
   * thus the list does not send it.
   */
  let isFirstOverAfterPickup = false;

  return {
    screenReaderInstructions: {
      draggable:
        "Drücke die Leertaste, um das Element aufzunehmen. Verschiebe es mit den Pfeiltasten. Drücke die Leertaste noch einmal, um es abzulegen, oder Escape, um abzubrechen.",
    },
    announcements: {
      onDragStart: ({ active }) => {
        isFirstOverAfterPickup = true;
        return `"${getName(active.id)}" ${describePosition(active)} aufgenommen.`;
      },
      onDragOver: ({ active, over }) => {
        const isPickupEcho = isFirstOverAfterPickup && over?.id === active.id;
        isFirstOverAfterPickup = false;
        if (isPickupEcho) return undefined;

        if (!over) return `"${getName(active.id)}" ist außerhalb der Liste.`;
        return `"${getName(active.id)}" ist jetzt ${describePosition(over)}.`;
      },
      onDragEnd: ({ active, over }) => {
        if (!over)
          return `"${getName(active.id)}" abgelegt. Die Reihenfolge bleibt gleich.`;
        return `"${getName(active.id)}" ${describePosition(over)} abgelegt.`;
      },
      onDragCancel: ({ active }) =>
        `Verschieben abgebrochen. "${getName(active.id)}" ist wieder ${describePosition(active)}.`,
    },
  };
};

/**
 * The sensors and the German screen reader texts for a `DndContext` with one
 * sortable list. The handle of each entry takes the pointer, the touch and
 * the keyboard: the space bar picks the entry up, the arrow keys move it, and
 * the space bar drops it.
 *
 * Keep `getName` stable (for example with `useCallback`). A new function
 * makes a new configuration, which forgets the state of a running drag.
 */
export const useSortableList = (getName: (id: UniqueIdentifier) => string) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const accessibility = useMemo(() => createAccessibility(getName), [getName]);

  return { sensors, accessibility };
};
