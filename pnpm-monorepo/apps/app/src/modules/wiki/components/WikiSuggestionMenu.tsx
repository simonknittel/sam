"use client";

import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import clsx from "clsx";
import {
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

export interface WikiSuggestionMenuHandle {
  readonly onKeyDown: (props: Pick<SuggestionKeyDownProps, "event">) => boolean;
}

/**
 * Width of the popup in px — must stay in sync with the Tailwind `w-64`
 * class on the menu container.
 */
export const WIKI_SUGGESTION_MENU_WIDTH = 256;

/** Gap kept between the popup and the right viewport edge */
const VIEWPORT_MARGIN = 24;

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
}

interface WikiSuggestionMenuProps<Item extends WikiSuggestionMenuItem> {
  readonly items: readonly Item[];
  readonly command: (item: Item) => void;
  readonly ref?: Ref<WikiSuggestionMenuHandle>;
}

/**
 * Keyboard-navigable popup shared by the wiki editor's suggestions (slash
 * commands, internal page links).
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
   * render instead of in an effect.
   */
  const [previousItems, setPreviousItems] = useState(items);
  if (previousItems !== items) {
    setPreviousItems(items);
    setSelectedIndex(0);
  }

  const selectIndex = (index: number) => {
    setSelectedIndex(index);
    const item = containerRef.current?.children[index];
    if (item instanceof HTMLElement) item.scrollIntoView({ block: "nearest" });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        selectIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        selectIndex((selectedIndex + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0)
    return (
      <div className="rounded-secondary border border-neutral-700 bg-neutral-900 p-2 text-sm text-neutral-500 shadow-lg">
        Keine Treffer
      </div>
    );

  return (
    <div
      ref={containerRef}
      className="flex max-h-72 w-64 flex-col overflow-auto rounded-secondary border border-neutral-700 bg-neutral-900 p-1 shadow-lg"
    >
      {items.map((item, index) => (
        <button
          key={item.id ?? item.title}
          type="button"
          onClick={() => command(item)}
          title={item.title}
          className={clsx(
            // shrink-0: items must overflow (scroll), not shrink into the max height
            "flex shrink-0 cursor-pointer items-center gap-2 rounded-secondary px-2 py-1 text-left text-sm hover:bg-neutral-800 hover:text-neutral-50",
            {
              "bg-neutral-800 text-neutral-50": index === selectedIndex,
              "text-neutral-300": index !== selectedIndex,
            },
          )}
        >
          {item.icon}
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            {item.title}
          </span>
        </button>
      ))}
    </div>
  );
};

/**
 * The Tiptap `Suggestion` render plumbing around WikiSuggestionMenu:
 * mounts the popup into the body and positions it at the caret.
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
    WikiSuggestionMenuProps<Item>
  > | null = null;

  /**
   * Escape removes the popup but the Suggestion plugin stays active — keep
   * it dismissed (keys type normally, no repositioning) until the
   * suggestion is re-triggered, like Notion.
   */
  let dismissed = false;

  const updatePosition = (clientRect: SuggestionProps["clientRect"]) => {
    const rect = clientRect?.();
    if (!rect || !component) return;
    const element = component.element;
    element.style.position = "fixed";
    element.style.left = `${Math.min(rect.left, window.innerWidth - WIKI_SUGGESTION_MENU_WIDTH - VIEWPORT_MARGIN)}px`;
    element.style.top = `${rect.bottom + 4}px`;
  };

  return {
    onStart: (props) => {
      dismissed = false;
      component = new ReactRenderer(WikiSuggestionMenu<Item>, {
        editor: props.editor,
        props: { items: props.items, command: props.command },
      });
      component.element.classList.add("z-50");
      document.body.appendChild(component.element);
      updatePosition(props.clientRect);
    },
    onUpdate: (props) => {
      if (dismissed) return;
      component?.updateProps({
        items: props.items,
        command: props.command,
      });
      updatePosition(props.clientRect);
    },
    onKeyDown: (props) => {
      if (dismissed) return false;
      if (props.event.key === "Escape") {
        dismissed = true;
        component?.element.remove();
        return true;
      }
      return component?.ref?.onKeyDown(props) ?? false;
    },
    onExit: () => {
      component?.element.remove();
      component?.destroy();
      component = null;
    },
  };
};
