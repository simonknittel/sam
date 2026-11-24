"use client";

import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { ItemPickerPopover } from "@/modules/common/components/ItemPicker/ItemPickerPopover";
import { ItemPickerRequiredInput } from "@/modules/common/components/ItemPicker/ItemPickerRequiredInput";
import type {
  VariantCatalog,
  VariantCatalogVariant,
} from "@/modules/fleet/queries/getVariantCatalog";
import clsx from "clsx";
import { useId, useRef, useState, type ReactNode } from "react";
import { FaChevronDown, FaSpaceShuttle } from "react-icons/fa";
import { VariantPanel } from "./VariantPanel";
import { VariantPickerValue } from "./VariantPickerValue";

interface Props {
  readonly className?: string;
  readonly catalog: VariantCatalog;
  readonly name: string;
  readonly label: ReactNode;
  /**
   * Prevents the deselection of the selected variant, and the submit of the
   * form without a selected variant
   */
  readonly required?: boolean;
  readonly autoFocus?: boolean;
}

export const VariantPicker = ({
  className,
  catalog,
  name,
  label,
  required = false,
  autoFocus = false,
}: Props) => {
  const [selectedVariantId, setSelectedVariantId] = useState<
    VariantCatalogVariant["id"] | null
  >(null);
  const [isOpen, setIsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const valueId = useId();
  const errorId = useId();
  const [isInvalid, setIsInvalid] = useState(false);
  const showsRequiredError = isInvalid && selectedVariantId === null;

  const handleVariantClick = (variantId: VariantCatalogVariant["id"]) => {
    if (variantId !== selectedVariantId) {
      setSelectedVariantId(variantId);
      setIsInvalid(false);
    } else if (!required) {
      setSelectedVariantId(null);
    }

    setIsOpen(false);
  };

  return (
    <div className={className}>
      <p id={labelId} className="mb-1">
        {label}
      </p>

      <ItemPickerPopover
        title="Schiff auswählen"
        trigger={
          <>
            {selectedVariantId ? (
              <span id={valueId} className="min-w-0">
                <VariantPickerValue
                  variantId={selectedVariantId}
                  catalog={catalog}
                />
              </span>
            ) : (
              <span
                id={valueId}
                className="flex h-8 items-center gap-2 px-2 font-mono text-sm"
              >
                <FaSpaceShuttle className="flex-none" /> Schiff auswählen
              </span>
            )}

            <FaChevronDown className="flex-none text-brand-red-500" />
          </>
        }
        triggerRender={
          <button
            ref={triggerRef}
            type="button"
            title="Schiff auswählen"
            aria-labelledby={`${labelId} ${valueId}`}
            aria-describedby={showsRequiredError ? errorId : undefined}
            autoFocus={autoFocus}
            className={clsx(
              "inline-flex max-w-full cursor-pointer items-center justify-between gap-1 rounded-secondary bg-neutral-700/50 pr-3 outline-offset-4 outline-interaction-700 hover:bg-neutral-600/50 focus-visible:outline-2 active:bg-neutral-700/30",
              { "ring-1 ring-brand-red-500": showsRequiredError },
            )}
          />
        }
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <VariantPanel
          mode={ItemPickerMode.Single}
          catalog={catalog}
          selectedVariantIds={selectedVariantId ? [selectedVariantId] : []}
          onVariantClick={handleVariantClick}
        />
      </ItemPickerPopover>

      {required && (
        <ItemPickerRequiredInput
          value={selectedVariantId ?? ""}
          onInvalid={() => {
            setIsInvalid(true);
            triggerRef.current?.focus();
          }}
        />
      )}

      {showsRequiredError && (
        <p id={errorId} className="mt-1 text-sm text-brand-red-300">
          Wähle ein Schiff aus.
        </p>
      )}

      {selectedVariantId && (
        <input type="hidden" name={name} value={selectedVariantId} />
      )}
    </div>
  );
};
