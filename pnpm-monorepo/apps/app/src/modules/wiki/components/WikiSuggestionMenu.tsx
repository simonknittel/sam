"use client";

import { PopoverBaseUIDetached } from "@/modules/common/components/PopoverBaseUI";
import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import clsx from "clsx";
import {
  Fragment,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

export interface WikiSuggestionMenuHandle {
  readonly onKeyDown: (props: Pick<SuggestionKeyDownProps, "event">) => boolean;
}

/** Maximum number of entries a suggestion popup shows */
const MAX_SUGGESTIONS = 10;

/**
 * Shared ranking of the wiki suggestion popups (page links, citizen
 * mentions): case-insensitive substring filter on the title, sorted
 * alphabetically with German collation, capped at MAX_SUGGESTIONS.
 */
export const rankWikiSuggestionItems = <Item extends { title: string }>(
  items: readonly Item[],
  query: string,
): Item[] => {
  const normalized = query.toLowerCase().trim();
  return items
    .filter((item) => item.title.toLowerCase().includes(normalized))
    .toSorted((itemA, itemB) => itemA.title.localeCompare(itemB.title, "de"))
    .slice(0, MAX_SUGGESTIONS);
};

interface WikiSuggestionMenuItem {
  /**
   * Unique key of the item. Optional for menus whose titles are already
   * unique (slash commands) — required whenever titles can collide (page
   * titles, citizen handles).
   */
  readonly id?: string;
  readonly title: string;
  readonly icon?: ReactNode;
  /** Secondary line under the title (e.g. node type of the copied block) */
  readonly subtitle?: string;
  /**
   * Renders a divider below the entry — separates pinned entries from
   * the regular ones (the insert palettes' "Kopierten Block einfügen").
   */
  readonly dividerAfter?: boolean;
  /**
   * Shown muted but inert: never triggers `command`, and the keyboard
   * selection skips it. The `subtitle` carries the reason (e.g. upload
   * entries the viewer lacks permission for).
   */
  readonly disabled?: boolean;
}

interface WikiSuggestionMenuProps<Item extends WikiSuggestionMenuItem> {
  readonly items: readonly Item[];
  readonly command: (item: Item) => void;
  readonly ref?: Ref<WikiSuggestionMenuHandle>;
}

/**
 * Keyboard-navigable list shared by the wiki editor's suggestion popups
 * (slash commands, internal page links, citizen mentions) and the gutter
 * plus button's insert palette. Renders only the list — the popover
 * chrome around it comes from PopoverBaseUI(Detached). Keys arrive from
 * outside (the Suggestion plugin or the palette's filter input) via the
 * imperative handle; focus never moves into the list.
 */
export const WikiSuggestionMenu = <Item extends WikiSuggestionMenuItem>({
  items,
  command,
  ref,
}: WikiSuggestionMenuProps<Item>) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Reset the selection when the filtered items change — adjusted during
   * render instead of in an effect. Starts on the first enabled item.
   */
  const [previousItems, setPreviousItems] = useState(items);
  if (previousItems !== items) {
    setPreviousItems(items);
    const firstEnabled = items.findIndex((item) => item.disabled !== true);
    setSelectedIndex(firstEnabled === -1 ? 0 : firstEnabled);
  }

  const selectIndex = (index: number) => {
    setSelectedIndex(index);
    /* Looked up by attribute — dividers make child indices unreliable */
    const item = containerRef.current?.querySelector(
      `[data-suggestion-index="${index}"]`,
    );
    if (item instanceof HTMLElement) item.scrollIntoView({ block: "nearest" });
  };

  /** Next index in the given direction, skipping disabled items (wraps) */
  const moveSelection = (direction: 1 | -1) => {
    let index = selectedIndex;
    let remainingSteps = items.length;
    while (remainingSteps > 0) {
      index = (index + direction + items.length) % items.length;
      if (items[index]?.disabled !== true) break;
      remainingSteps -= 1;
    }
    selectIndex(index);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        moveSelection(-1);
        return true;
      }
      if (event.key === "ArrowDown") {
        moveSelection(1);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item && item.disabled !== true) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0)
    return <div className="text-sm text-neutral-500">Keine Treffer</div>;

  return (
    <div
      ref={containerRef}
      className="flex max-h-72 w-64 flex-col gap-1 overflow-auto"
    >
      {items.map((item, index) => (
        <Fragment key={item.id ?? item.title}>
          <button
            type="button"
            data-suggestion-index={index}
            onClick={() => command(item)}
            title={item.title}
            disabled={item.disabled === true}
            className={clsx(
              // shrink-0: items must overflow (scroll), not shrink into the max height
              "flex shrink-0 items-center gap-2 rounded-secondary px-2 py-1 text-left text-sm",
              item.disabled === true
                ? "cursor-not-allowed text-neutral-600"
                : [
                    "cursor-pointer hover:bg-neutral-800 hover:text-neutral-50",
                    {
                      "bg-neutral-800 text-neutral-50": index === selectedIndex,
                      "text-neutral-300": index !== selectedIndex,
                    },
                  ],
            )}
          >
            {item.icon !== undefined && (
              /* Fixed box — titles must align across icon shapes (svgs, the
               * slash commands' H badges, page icon images) */
              <span className="flex size-4 flex-none items-center justify-center">
                {item.icon}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col items-start">
              <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                {item.title}
              </span>
              {item.subtitle !== undefined && (
                <span className="text-xs text-neutral-500">
                  {item.subtitle}
                </span>
              )}
            </span>
          </button>

          {item.dividerAfter === true && (
            <div className="shrink-0 border-t border-neutral-800" />
          )}
        </Fragment>
      ))}
    </div>
  );
};

interface WikiSuggestionPopoverProps<Item extends WikiSuggestionMenuItem> {
  readonly items: readonly Item[];
  readonly command: (item: Item) => void;
  /** Viewport rect of the caret the popup anchors to */
  readonly anchorRect: DOMRect | null;
  readonly open: boolean;
  /** Base UI dismissed the popup (outside press, Escape) */
  readonly onDismiss: () => void;
  readonly ref?: Ref<WikiSuggestionMenuHandle>;
}

/**
 * Caret-anchored popover around WikiSuggestionMenu: flips above the
 * caret when the viewport bottom is too close.
 */
const WikiSuggestionPopover = <Item extends WikiSuggestionMenuItem>({
  items,
  command,
  anchorRect,
  open,
  onDismiss,
  ref,
}: WikiSuggestionPopoverProps<Item>) => {
  const anchor = useMemo(
    () => (anchorRect ? { getBoundingClientRect: () => anchorRect } : null),
    [anchorRect],
  );

  return (
    <PopoverBaseUIDetached
      title="Vorschläge"
      open={open && anchor !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
      anchor={anchor}
      side="bottom"
    >
      <WikiSuggestionMenu items={items} command={command} ref={ref} />
    </PopoverBaseUIDetached>
  );
};

/**
 * The Tiptap `Suggestion` render plumbing around WikiSuggestionMenu:
 * feeds the caret rect and the filtered items into the popover and
 * routes the plugin's key events into the menu.
 */
export const createWikiSuggestionRender = <
  Item extends WikiSuggestionMenuItem,
>(): {
  onStart: (props: SuggestionProps<Item, Item>) => void;
  onUpdate: (props: SuggestionProps<Item, Item>) => void;
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  onExit: () => void;
} => {
  let component: ReactRenderer<
    WikiSuggestionMenuHandle,
    WikiSuggestionPopoverProps<Item>
  > | null = null;

  /**
   * Escape (or an outside press) removes the popup but the Suggestion
   * plugin stays active — keep it dismissed (keys type normally) until
   * the suggestion is re-triggered, like Notion.
   */
  let dismissed = false;

  const dismiss = () => {
    dismissed = true;
    component?.updateProps({ open: false });
  };

  return {
    onStart: (props) => {
      dismissed = false;
      /**
       * The popup itself renders through the popover's portal — the
       * renderer's own element stays empty and off-document.
       */
      component = new ReactRenderer(WikiSuggestionPopover<Item>, {
        editor: props.editor,
        props: {
          items: props.items,
          command: props.command,
          anchorRect: props.clientRect?.() ?? null,
          open: true,
          onDismiss: dismiss,
        },
      });
    },
    onUpdate: (props) => {
      if (dismissed) return;
      component?.updateProps({
        items: props.items,
        command: props.command,
        anchorRect: props.clientRect?.() ?? null,
      });
    },
    onKeyDown: (props) => {
      if (dismissed) return false;
      if (props.event.key === "Escape") {
        dismiss();
        return true;
      }
      return component?.ref?.onKeyDown(props) ?? false;
    },
    onExit: () => {
      component?.destroy();
      component = null;
    },
  };
};
