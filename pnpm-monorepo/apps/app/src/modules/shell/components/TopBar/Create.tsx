"use client";

import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { useCreateContext } from "@/modules/common/components/CreateContext";
import { Link } from "@/modules/common/components/Link";
import {
  PopoverBaseUI,
  usePopoverBaseUI,
} from "@/modules/common/components/PopoverBaseUI";
import type { ComponentProps } from "react";
import { FaPlus } from "react-icons/fa";
import {
  CreateItemType,
  useCreateItems,
  type CreateItem,
} from "../../hooks/useCreateItems";

type PopoverProps = ComponentProps<typeof PopoverBaseUI>;

interface Props {
  readonly className?: string;
  readonly triggerClassName?: string;
  readonly side?: PopoverProps["side"];
  readonly positionerClassName?: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  /** Called after a click on an item, after the popover closed */
  readonly onSelect?: () => void;
}

export const Create = ({
  className,
  triggerClassName = "h-full px-6",
  side,
  positionerClassName,
  open,
  onOpenChange,
  onSelect,
}: Props) => {
  const items = useCreateItems();

  if (items.length === 0) return null;

  return (
    <div className={className}>
      <PopoverBaseUI
        title="Neu erstellen"
        trigger={
          <>
            <FaPlus />
            Neu
          </>
        }
        triggerRender={
          <Button2
            variant={Button2Variant.Secondary}
            colorSchema={Button2ColorSchema.InteractionMuted}
          />
        }
        triggerClassName={triggerClassName}
        childrenClassName="flex flex-col gap-px w-52"
        side={side}
        positionerClassName={positionerClassName}
        open={open}
        onOpenChange={onOpenChange}
      >
        <PopoverChildren items={items} onSelect={onSelect} />
      </PopoverBaseUI>
    </div>
  );
};

interface PopoverChildrenProps {
  readonly items: CreateItem[];
  readonly onSelect?: () => void;
}

const PopoverChildren = ({ items, onSelect }: PopoverChildrenProps) => {
  const { closePopover } = usePopoverBaseUI();
  const { openCreateModal } = useCreateContext();

  const className =
    "block cursor-pointer hover:outline-interaction-700 focus-visible:outline-interaction-700 active:outline-interaction-500 outline-offset-4 outline outline-transparent transition-colors rounded-primary overflow-hidden bg-secondary group p-2 text-xs text-left";

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        switch (item.type) {
          case CreateItemType.Link:
            return (
              <Link
                key={item.label}
                onClick={() => {
                  closePopover();
                  onSelect?.();
                }}
                href={item.href}
                className={className}
              >
                {item.label}
              </Link>
            );

          case CreateItemType.Modal:
            return (
              <button
                key={item.label}
                onClick={() => {
                  openCreateModal(item.modalId);
                  closePopover();
                  onSelect?.();
                }}
                className={className}
              >
                {item.label}
              </button>
            );

          default:
            throw new Error(`Unknown item.type: ${item satisfies never}`);
        }
      })}
    </div>
  );
};
