import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  cloneElement,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from "react";

interface ItemBaseProps {
  readonly icon?: ReactElement;
  readonly hideIconPlaceholder?: boolean;
  readonly label: string;
  readonly keywords?: string[];
  readonly section?: string;
}

interface LinkItemProps extends ItemBaseProps {
  readonly href: string;
  readonly setSearch: Dispatch<SetStateAction<string>>;
  readonly setOpen: Dispatch<SetStateAction<boolean>>;
}

export const LinkItem = ({
  href,
  icon,
  hideIconPlaceholder = false,
  label,
  keywords,
  section,
  setOpen,
  setSearch,
}: LinkItemProps) => {
  const router = useRouter();

  const _icon = icon
    ? cloneElement(icon, {
        // @ts-expect-error
        className: "text-neutral-500 text-sm",
      })
    : null;

  return (
    <Command.Item
      keywords={keywords}
      onSelect={() => {
        router.push(href);
        setOpen(false);
        setSearch("");
      }}
    >
      {_icon || (!hideIconPlaceholder ? <div className="size-4" /> : null)}

      {label}

      {section && <span className="text-neutral-500 text-xs">{section}</span>}
    </Command.Item>
  );
};

interface PageItemProps extends ItemBaseProps {
  readonly setSearch: Dispatch<SetStateAction<string>>;
  readonly setPages: () => void;
}

export const PageItem = ({
  icon,
  label,
  hideIconPlaceholder = false,
  keywords,
  section,
  setPages,
  setSearch,
}: PageItemProps) => {
  const _icon = icon
    ? cloneElement(icon, {
        // @ts-expect-error
        className: "text-neutral-500 text-sm",
      })
    : null;

  return (
    <Command.Item
      keywords={keywords}
      onSelect={() => {
        setPages();
        setSearch("");
      }}
    >
      {_icon || (!hideIconPlaceholder ? <div className="size-4" /> : null)}

      {label}

      {section && <span className="text-neutral-500 text-xs">{section}</span>}
    </Command.Item>
  );
};

interface CommandItemProps extends ItemBaseProps {
  readonly onSelect: () => void;
}

export const CommandItem = ({
  icon,
  label,
  hideIconPlaceholder = false,
  keywords,
  section,
  onSelect,
}: CommandItemProps) => {
  const _icon = icon
    ? cloneElement(icon, {
        // @ts-expect-error
        className: "text-neutral-500 text-sm",
      })
    : null;

  return (
    <Command.Item keywords={keywords} onSelect={onSelect}>
      {_icon || (!hideIconPlaceholder ? <div className="size-4" /> : null)}

      {label}

      {section && <span className="text-neutral-500 text-xs">{section}</span>}
    </Command.Item>
  );
};
