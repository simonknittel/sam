"use client";

import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { Tooltip } from "@/modules/common/components/Tooltip";
import type {
  Event,
  EventPosition,
  EventPositionRequiredVariant,
  Manufacturer,
  Series,
  Variant,
} from "@prisma/client";
import clsx from "clsx";
import { flatten } from "lodash";
import { unstable_rethrow } from "next/navigation";
import {
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import toast from "react-hot-toast";
import {
  FaChevronDown,
  FaChevronUp,
  FaInfoCircle,
  FaPen,
  FaPlus,
  FaSave,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";
import { createEventPosition } from "../actions/createEventPosition";
import { updateEventPosition } from "../actions/updateEventPosition";

interface BaseProps {
  readonly className?: string;
  readonly variants: (Manufacturer & {
    series: (Series & {
      variants: Variant[];
    })[];
  })[];
}

interface CreateProps {
  readonly eventId: Event["id"];
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
      try {
        const response =
          "position" in props
            ? await updateEventPosition(formData)
            : await createEventPosition(formData);

        if (response.error) {
          toast.error(response.error);
          console.error(response);
          return;
        }

        toast.success(response.success!);
        if (formData.has("createAnother")) {
          nameInputRef.current?.focus();
          return;
        } else {
          setIsOpen(false);
        }
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
      }
    });
  };

  return (
    <>
      {"eventId" in props && !("parentPositionId" in props) && (
        <Button2
          onClick={handleClick}
          className={clsx(props.className)}
          title="Posten oder Gruppe hinzufügen"
        >
          <span className="hidden md:inline">Hinzufügen</span>
          {isOpen ? <FaSpinner className="animate-spin" /> : <FaPlus />}
        </Button2>
      )}

      {"eventId" in props && "parentPositionId" in props && (
        <Button
          onClick={handleClick}
          variant="tertiary"
          className={clsx("px-2 w-auto", props.className)}
          title="Posten oder Gruppe hinzufügen"
          iconOnly
        >
          {isOpen ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaPlus className="text-lg" />
          )}
        </Button>
      )}

      {"position" in props && (
        <Button
          onClick={handleClick}
          variant="tertiary"
          className={clsx("px-2 w-auto", props.className)}
          title="Posten bearbeiten"
          iconOnly
        >
          {isOpen ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaPen className="text-lg" />
          )}
        </Button>
      )}

      <Modal
        isOpen={isOpen}
        onRequestClose={handleRequestClose}
        className="w-[480px]"
        heading={
          <h2>
            Posten oder Gruppe{" "}
            {"position" in props ? "bearbeiten" : "hinzufügen"}
          </h2>
        }
      >
        <form action={formAction}>
          {"position" in props && props.position && (
            <input type="hidden" name="positionId" value={props.position.id} />
          )}
          {"eventId" in props && props.eventId && (
            <input type="hidden" name="eventId" value={props.eventId} />
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

          <div className="flex flex-col gap-2 mt-8">
            <Button2 type="submit" disabled={isPending}>
              {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
              Speichern
            </Button2>

            {"eventId" in props && (
              <Button
                type="submit"
                disabled={isPending}
                variant="tertiary"
                name="createAnother"
              >
                {isPending ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSave />
                )}
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
  readonly variants: (Manufacturer & {
    series: (Series & {
      variants: Variant[];
    })[];
  })[];
  readonly defaultValue?: Variant["id"][];
}

const RequiredVariants = ({
  className,
  variants,
  defaultValue,
}: RequiredVariantsProps) => {
  const [items, setItems] = useState<Variant["id"][]>(defaultValue || []);

  const variantOptions: {
    manufacturer: Manufacturer;
    variants: Variant[];
  }[] = variants
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((manufacturer) => {
      return {
        manufacturer,
        variants: flatten(
          manufacturer.series
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((series) =>
              series.variants
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((variant) => variant),
            ),
        ),
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
        variant="secondary"
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
