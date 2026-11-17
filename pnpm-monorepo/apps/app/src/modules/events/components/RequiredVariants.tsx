"use client";

import Button from "@/modules/common/components/Button";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { ItemPickerPopover } from "@/modules/common/components/ItemPicker/ItemPickerPopover";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { VariantPanel } from "@/modules/fleet/components/VariantPicker/VariantPanel";
import { VariantPickerValue } from "@/modules/fleet/components/VariantPicker/VariantPickerValue";
import type {
  VariantCatalog,
  VariantCatalogVariant,
} from "@/modules/fleet/queries/getVariantCatalog";
import { useState } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaSpaceShuttle,
  FaTrash,
} from "react-icons/fa";

type VariantId = VariantCatalogVariant["id"];

interface Props {
  readonly className?: string;
  readonly catalog: VariantCatalog;
  readonly defaultValue?: readonly VariantId[];
}

/**
 * The required variants of a position, in the order of preference: the
 * lineup shows the first variant and the others as alternatives. The picker
 * adds a variant at the end, and the rows change the order.
 */
export const RequiredVariants = ({
  className,
  catalog,
  defaultValue = [],
}: Props) => {
  const [variantIds, setVariantIds] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);

  const removeVariant = (variantId: VariantId) => {
    setVariantIds((previous) => previous.filter((id) => id !== variantId));
  };

  const toggleVariant = (variantId: VariantId) => {
    if (variantIds.includes(variantId)) {
      removeVariant(variantId);
    } else {
      setVariantIds((previous) => [...previous, variantId]);
    }
  };

  /**
   * Swaps the variant at the index with the variant before it. The first
   * row cannot move up and the last row cannot move down (the buttons are
   * disabled), thus both indexes are always in the list.
   */
  const swapWithPrevious = (index: number) => {
    setVariantIds((previous) =>
      previous
        .with(index, previous[index - 1])
        .with(index - 1, previous[index]),
    );
  };

  return (
    <div className={className}>
      <p className="flex items-center gap-2">
        Erforderliches Schiff (optional)
        <Tooltip triggerChildren={<FaInfoCircle />}>
          Für ein Multicrew-Schiff sollte das erforderliche Schiff nur bei einem
          Posten angegeben werden, bspw. für den Piloten.
          <br />
          <br />
          Bei den übrigen Posten, bspw. Turmschütze, sollte kein Schiff
          angegeben werden.
        </Tooltip>
      </p>

      {variantIds.length > 0 && (
        <ol
          aria-label="Erforderliche Schiffe"
          className="mt-2 flex flex-col gap-1"
        >
          {variantIds.map((variantId, index) => (
            <RequiredVariantRow
              key={variantId}
              variantId={variantId}
              catalog={catalog}
              isFirst={index === 0}
              isLast={index === variantIds.length - 1}
              onMoveUp={() => swapWithPrevious(index)}
              onMoveDown={() => swapWithPrevious(index + 1)}
              onRemove={() => removeVariant(variantId)}
            />
          ))}
        </ol>
      )}

      <ItemPickerPopover
        title="Schiff auswählen"
        trigger={
          <>
            <FaSpaceShuttle /> Schiff auswählen
          </>
        }
        triggerRender={
          <Button2
            type="button"
            title="Schiff auswählen"
            variant={Button2Variant.Secondary}
            className="mt-2"
          />
        }
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <VariantPanel
          mode={ItemPickerMode.Multiple}
          catalog={catalog}
          selectedVariantIds={variantIds}
          onVariantClick={toggleVariant}
        />
      </ItemPickerPopover>

      {variantIds.map((variantId) => (
        <input
          key={variantId}
          type="hidden"
          name="variantId[]"
          value={variantId}
        />
      ))}
    </div>
  );
};

interface RequiredVariantRowProps {
  readonly variantId: VariantId;
  readonly catalog: VariantCatalog;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onRemove: () => void;
}

const RequiredVariantRow = ({
  variantId,
  catalog,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: RequiredVariantRowProps) => {
  return (
    <li className="flex items-center gap-2">
      <div className="flex flex-col justify-center">
        <Button
          variant="tertiary"
          onClick={onMoveUp}
          type="button"
          title="Hoch verschieben"
          className="h-auto p-1 disabled:grayscale"
          disabled={isFirst}
        >
          <FaChevronUp />
        </Button>

        <Button
          variant="tertiary"
          onClick={onMoveDown}
          type="button"
          title="Runter verschieben"
          className="h-auto p-1 disabled:grayscale"
          disabled={isLast}
        >
          <FaChevronDown />
        </Button>
      </div>

      <div className="min-w-0 flex-1 rounded-secondary bg-neutral-700/50">
        <VariantPickerValue variantId={variantId} catalog={catalog} />
      </div>

      <Button
        variant="tertiary"
        onClick={onRemove}
        type="button"
        title="Schiff entfernen"
        className="h-auto px-1"
      >
        <FaTrash />
      </Button>
    </li>
  );
};
