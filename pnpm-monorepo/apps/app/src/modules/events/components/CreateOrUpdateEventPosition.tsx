"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { Tooltip } from "@/modules/common/components/Tooltip";
import type {
  VariantCatalogManufacturer,
  VariantCatalogVariant,
} from "@/modules/fleet/queries/getVariantCatalog";
import type {
  EventPosition,
  EventPositionRequiredVariant,
  Variant,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import {
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaPen,
  FaPlus,
  FaSave,
  FaTrash,
} from "react-icons/fa";
import { createEventPosition } from "../actions/createEventPosition";
import { updateEventPosition } from "../actions/updateEventPosition";
import {
  eventContainerFormValues,
  type EventContainer,
} from "../utils/eventContainer";

const ADD_LABEL = "Posten hinzufügen";
const EDIT_LABEL = "Posten bearbeiten";

interface BaseProps {
  readonly className?: string;
  readonly variants: readonly VariantCatalogManufacturer[];
}

interface CreateProps {
  /** The event or template the new position is added to */
  readonly container: EventContainer;
  readonly parentPositionId?: EventPosition["id"] | null;
}

interface UpdateProps {
  readonly position: EventPosition & {
    requiredVariants: EventPositionRequiredVariant[];
  };
}

type Props = (CreateProps | UpdateProps) & BaseProps;

export const CreateOrUpdateEventPosition = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const nameInputId = useId();
  const descriptionInputId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    setIsOpen(true);
  };

  const handleRequestClose = () => {
    setIsOpen(false);
  };

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const succeeded = await runAction(
        "position" in props ? updateEventPosition : createEventPosition,
        formData,
      );
      if (!succeeded) return;

      if (formData.has("createAnother")) {
        nameInputRef.current?.focus();
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      {"container" in props && !("parentPositionId" in props) && (
        <Tooltip
          asChild
          triggerChildren={
            <Button2
              onClick={handleClick}
              className={clsx(props.className)}
              aria-label={ADD_LABEL}
            >
              <span className="hidden md:inline">Hinzufügen</span>
              {isOpen ? <AsciiSpinner /> : <FaPlus />}
            </Button2>
          }
        >
          {ADD_LABEL}
        </Tooltip>
      )}

      {"container" in props && "parentPositionId" in props && (
        <Tooltip
          asChild
          triggerChildren={
            <Button
              onClick={handleClick}
              variant="tertiary"
              className={clsx("px-2 w-auto", props.className)}
              aria-label={ADD_LABEL}
              iconOnly
            >
              {isOpen ? <AsciiSpinner /> : <FaPlus className="text-lg" />}
            </Button>
          }
        >
          {ADD_LABEL}
        </Tooltip>
      )}

      {"position" in props && (
        <Tooltip
          asChild
          triggerChildren={
            <Button
              onClick={handleClick}
              variant="tertiary"
              className={clsx("px-2 w-auto", props.className)}
              aria-label={EDIT_LABEL}
              iconOnly
            >
              {isOpen ? <AsciiSpinner /> : <FaPen className="text-lg" />}
            </Button>
          }
        >
          {EDIT_LABEL}
        </Tooltip>
      )}

      <Modal
        isOpen={isOpen}
        onRequestClose={handleRequestClose}
        className="w-120"
        heading={
          <h2>Posten {"position" in props ? "bearbeiten" : "hinzufügen"}</h2>
        }
      >
        <form action={formAction}>
          {"position" in props && props.position && (
            <input type="hidden" name="positionId" value={props.position.id} />
          )}
          {"container" in props &&
            Object.entries(eventContainerFormValues(props.container)).map(
              ([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ),
            )}
          {"parentPositionId" in props && props.parentPositionId && (
            <input
              type="hidden"
              name="parentPositionId"
              value={props.parentPositionId}
            />
          )}

          <TextInput
            label="Name"
            autoFocus
            name="name"
            required
            maxLength={256}
            defaultValue={("position" in props && props.position?.name) || ""}
            id={nameInputId}
            ref={nameInputRef}
          />

          <Textarea
            label="Beschreibung (optional)"
            name="description"
            maxLength={512}
            defaultValue={
              ("position" in props && props.position.description) || ""
            }
            id={descriptionInputId}
            className="mt-4"
          />

          <RequiredVariants
            variants={props.variants}
            defaultValue={
              "position" in props
                ? props.position.requiredVariants.map(
                    (requiredVariant) => requiredVariant.variantId,
                  )
                : undefined
            }
            className="mt-4"
          />

          <PositionFormatting
            defaultFontSize={
              "position" in props ? props.position.fontSize : undefined
            }
            defaultBackgroundColor={
              "position" in props ? props.position.backgroundColor : undefined
            }
            defaultTextColor={
              "position" in props ? props.position.textColor : undefined
            }
            className="mt-4"
          />

          <div className="flex flex-col gap-2 mt-8">
            <Button2 type="submit" disabled={isPending}>
              {isPending ? <AsciiSpinner /> : <FaSave />}
              Speichern
            </Button2>

            {"container" in props && (
              <Button
                type="submit"
                disabled={isPending}
                variant="tertiary"
                name="createAnother"
              >
                {isPending ? <AsciiSpinner /> : <FaSave />}
                Speichern und weiteren Posten erstellen
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
};

interface RequiredVariantsProps {
  readonly className?: string;
  readonly variants: readonly VariantCatalogManufacturer[];
  readonly defaultValue?: Variant["id"][];
}

const RequiredVariants = ({
  className,
  variants,
  defaultValue,
}: RequiredVariantsProps) => {
  const [items, setItems] = useState<Variant["id"][]>(defaultValue || []);

  const variantOptions: {
    manufacturer: VariantCatalogManufacturer;
    variants: VariantCatalogVariant[];
  }[] = variants
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((manufacturer) => {
      return {
        manufacturer,
        variants: manufacturer.series
          .toSorted((a, b) => a.name.localeCompare(b.name))
          .map((series) =>
            series.variants.toSorted((a, b) => a.name.localeCompare(b.name)),
          )
          .flat(),
      };
    });

  const handleCreate = () => {
    setItems((prev) => [...prev, "-"]);
  };

  const handleChange = (
    event: ChangeEvent<HTMLSelectElement>,
    index: number,
  ) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = event.target.value;
      return newItems;
    });
  };

  const handleDelete = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const handleMoveUp = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const temp = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = temp;
      return newItems;
    });
  };
  const handleMoveDown = (index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const temp = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = temp;
      return newItems;
    });
  };

  return (
    <>
      <label className={clsx("flex gap-2 items-center", className)}>
        Erforderliches Schiff (optional)
        <Tooltip triggerChildren={<FaInfoCircle />}>
          Für ein Multicrew-Schiff sollte das erforderliche Schiff nur bei einem
          Posten angegeben werden, bspw. für den Piloten.
          <br />
          <br />
          Bei den übrigen Posten, bspw. Turmschütze, sollte kein Schiff
          angegeben werden.
        </Tooltip>
      </label>

      {items.map((item, index) => (
        <div key={item} className="flex gap-2 mt-2">
          <div className="flex flex-col justify-center">
            <Button
              variant="tertiary"
              onClick={() => handleMoveUp(index)}
              type="button"
              title="Hoch verschieben"
              className="h-auto p-1 disabled:grayscale"
              disabled={index === 0}
            >
              <FaChevronUp />
            </Button>

            <Button
              variant="tertiary"
              onClick={() => handleMoveDown(index)}
              type="button"
              title="Runter verschieben"
              className="h-auto p-1 disabled:grayscale"
              disabled={index === items.length - 1}
            >
              <FaChevronDown />
            </Button>
          </div>

          <select
            className="p-2 rounded-secondary bg-neutral-900 w-full"
            defaultValue={item}
            onChange={(e) => handleChange(e, index)}
          >
            <option value="-" disabled>
              -
            </option>

            {variantOptions.map((option) => (
              <optgroup
                key={option.manufacturer.id}
                label={option.manufacturer.name}
              >
                {option.variants.map((variant) => (
                  <option
                    key={variant.id}
                    value={variant.id}
                    disabled={items.includes(variant.id)}
                  >
                    {variant.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <Button
            variant="tertiary"
            onClick={() => handleDelete(index)}
            type="button"
            title="Löschen"
            className="h-auto px-1"
          >
            <FaTrash />
          </Button>
        </div>
      ))}

      <Button2
        onClick={handleCreate}
        type="button"
        variant={Button2Variant.Secondary}
        className={clsx("mt-2", {
          "grayscale pointer-events-none": items.some((item) => item === "-"),
        })}
        disabled={items.some((item) => item === "-")}
      >
        <FaPlus />
        {items.length > 0 ? "Alternative hinzufügen" : "Hinzufügen"}
      </Button2>

      {items
        .filter((item) => item !== "-")
        .map((item) => (
          <input type="hidden" name="variantId[]" value={item} key={item} />
        ))}
    </>
  );
};

interface PositionFormattingProps {
  readonly className?: string;
  readonly defaultFontSize?: string | null;
  readonly defaultBackgroundColor?: string | null;
  readonly defaultTextColor?: string | null;
}

const PositionFormatting = ({
  className,
  defaultFontSize,
  defaultBackgroundColor,
  defaultTextColor,
}: PositionFormattingProps) => {
  const [backgroundColor, setBackgroundColor] = useState<
    string | null | undefined
  >(defaultBackgroundColor);
  const [textColor, setTextColor] = useState<string | null | undefined>(
    defaultTextColor,
  );

  return (
    <div className={clsx("space-y-3", className)}>
      <h3 className="text-gray-500 font-mono uppercase text-xs">
        Formatierung
      </h3>

      <div>
        <label className="block text-sm mb-1">Schriftgröße</label>
        <select
          name="fontSize"
          className="p-2 rounded-secondary bg-neutral-900 w-full"
          defaultValue={defaultFontSize || ""}
        >
          <option value="">Standard</option>
          <option value="large">Groß</option>
        </select>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm mb-1">Hintergrundfarbe</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              className="w-10 h-10 rounded cursor-pointer bg-neutral-900 border border-white/10 p-0"
              value={backgroundColor || "#262626"}
              onChange={(e) => setBackgroundColor(e.target.value)}
            />
            <button
              type="button"
              className="p-2 rounded-secondary bg-neutral-900 flex-1 text-left font-mono text-sm text-neutral-400 hover:text-white"
              onClick={() =>
                setBackgroundColor(backgroundColor ? null : "#262626")
              }
            >
              {backgroundColor || "Keine"}
            </button>
          </div>
          {backgroundColor && (
            <input
              type="hidden"
              name="backgroundColor"
              value={backgroundColor}
            />
          )}
        </div>

        <div className="flex-1">
          <label className="block text-sm mb-1">Textfarbe</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              className="w-10 h-10 rounded cursor-pointer bg-neutral-900 border border-white/10 p-0"
              value={textColor || "#e5e5e5"}
              onChange={(e) => setTextColor(e.target.value)}
            />
            <button
              type="button"
              className="p-2 rounded-secondary bg-neutral-900 flex-1 text-left font-mono text-sm text-neutral-400 hover:text-white"
              onClick={() => setTextColor(textColor ? null : "#e5e5e5")}
            >
              {textColor || "Keine"}
            </button>
          </div>
          {textColor && (
            <input type="hidden" name="textColor" value={textColor} />
          )}
        </div>
      </div>
    </div>
  );
};
