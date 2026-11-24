"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import Modal from "@/modules/common/components/Modal";
import { Tooltip } from "@/modules/common/components/Tooltip";
import type { VariantCatalog } from "@/modules/fleet/queries/getVariantCatalog";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import { useRolesContext } from "@/modules/roles/components/RolesContext";
import { EventPositionRoleMatch } from "@sam-monorepo/database/browser";
import {
  MAXIMUM_POSITION_DESCRIPTION_LENGTH,
  MAXIMUM_POSITION_NAME_LENGTH,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { useId, useRef, useState, useTransition } from "react";
import { FaPen, FaPlus, FaSave } from "react-icons/fa";
import { createEventPosition } from "../actions/createEventPosition";
import { updateEventPosition } from "../actions/updateEventPosition";
import {
  eventContainerFormValues,
  type EventContainer,
} from "../utils/eventContainer";
import type { PositionType } from "./Position";
import { getRoleMatchLabel, RequiredRoleBadges } from "./PositionRequiredRoles";
import { RequiredVariants } from "./RequiredVariants";

const ADD_LABEL = "Posten hinzufügen";
const EDIT_LABEL = "Posten bearbeiten";

interface BaseProps {
  readonly className?: string;
  readonly variantCatalog: VariantCatalog;
}

interface CreateProps {
  readonly container: EventContainer;
  readonly parentPositionId?: PositionType["id"] | null;
}

interface UpdateProps {
  readonly position: Pick<
    PositionType,
    | "id"
    | "name"
    | "description"
    | "requiredVariants"
    | "requiredRoles"
    | "requiredRoleMatch"
    | "fontSize"
    | "backgroundColor"
    | "textColor"
  >;
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
              className={clsx("w-auto px-2", props.className)}
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
              className={clsx("w-auto px-2", props.className)}
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
            maxLength={MAXIMUM_POSITION_NAME_LENGTH}
            defaultValue={("position" in props && props.position?.name) || ""}
            id={nameInputId}
            ref={nameInputRef}
          />

          <Textarea
            label="Beschreibung (optional)"
            name="description"
            maxLength={MAXIMUM_POSITION_DESCRIPTION_LENGTH}
            defaultValue={
              ("position" in props && props.position.description) || ""
            }
            id={descriptionInputId}
            className="mt-4"
          />

          <RequiredVariants
            catalog={props.variantCatalog}
            defaultValue={
              "position" in props
                ? props.position.requiredVariants.map(
                    (requiredVariant) => requiredVariant.variantId,
                  )
                : undefined
            }
            className="mt-4"
          />

          <RequiredRoles
            defaultRoleIds={
              "position" in props
                ? props.position.requiredRoles.map(({ roleId }) => roleId)
                : undefined
            }
            defaultMatch={
              "position" in props ? props.position.requiredRoleMatch : undefined
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

          <div className="mt-8 flex flex-col gap-2">
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

interface RequiredRolesProps {
  readonly className?: string;
  readonly defaultRoleIds?: readonly string[];
  readonly defaultMatch?: EventPositionRoleMatch;
}

/**
 * The match of the roles is a choice only for two roles or more. With fewer
 * roles, the form keeps the choice in a hidden field. The save keeps the
 * required roles that the user cannot see (see `writeLineupPositionChange()`),
 * thus they are not in the picker and the user cannot remove them.
 */
const RequiredRoles = ({
  className,
  defaultRoleIds = [],
  defaultMatch = EventPositionRoleMatch.ANY,
}: RequiredRolesProps) => {
  const { roles: visibleRoles } = useRolesContext();
  const isVisible = (roleId: string) =>
    visibleRoles.some((role) => role.id === roleId);
  const hiddenRoleIds = defaultRoleIds.filter((roleId) => !isVisible(roleId));
  const [roleIds, setRoleIds] = useState<readonly string[]>(() =>
    defaultRoleIds.filter(isVisible),
  );
  const [match, setMatch] = useState(defaultMatch);
  const matchInputId = useId();

  return (
    <div className={clsx(className)}>
      <RolePicker
        mode={ItemPickerMode.Multiple}
        name="requiredRoleId[]"
        label="Erforderliche Rolle (optional)"
        value={roleIds}
        onChange={setRoleIds}
      />

      {hiddenRoleIds.length > 0 && (
        <div className="mt-2 text-sm text-neutral-500">
          <p>
            Dazu kommen Rollen, die du nicht sehen darfst. Sie bleiben beim
            Speichern erhalten.
          </p>
          <RequiredRoleBadges roleIds={hiddenRoleIds} className="mt-1" />
        </div>
      )}

      {roleIds.length + hiddenRoleIds.length > 1 ? (
        <div className="mt-2">
          <label htmlFor={matchInputId} className="mb-1 block text-sm">
            Der Citizen benötigt
          </label>
          <select
            id={matchInputId}
            name="requiredRoleMatch"
            className="w-full rounded-secondary bg-neutral-900 p-2"
            value={match}
            onChange={(event) =>
              setMatch(event.target.value as EventPositionRoleMatch)
            }
          >
            {Object.values(EventPositionRoleMatch).map((roleMatch) => (
              <option key={roleMatch} value={roleMatch}>
                {getRoleMatchLabel(roleMatch)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="requiredRoleMatch" value={match} />
      )}
    </div>
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
      <h3 className="font-mono text-xs text-gray-500 uppercase">
        Formatierung
      </h3>

      <div>
        <label className="mb-1 block text-sm">Schriftgröße</label>
        <select
          name="fontSize"
          className="w-full rounded-secondary bg-neutral-900 p-2"
          defaultValue={defaultFontSize || "normal"}
        >
          <option value="normal">Standard</option>
          <option value="large">Groß</option>
        </select>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm">Hintergrundfarbe</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="size-10 cursor-pointer rounded border border-white/10 bg-neutral-900 p-0"
              value={backgroundColor || "#262626"}
              onChange={(e) => setBackgroundColor(e.target.value)}
            />
            <button
              type="button"
              className="flex-1 rounded-secondary bg-neutral-900 p-2 text-left font-mono text-sm text-neutral-400 hover:text-white"
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
          <label className="mb-1 block text-sm">Textfarbe</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="size-10 cursor-pointer rounded border border-white/10 bg-neutral-900 p-0"
              value={textColor || "#e5e5e5"}
              onChange={(e) => setTextColor(e.target.value)}
            />
            <button
              type="button"
              className="flex-1 rounded-secondary bg-neutral-900 p-2 text-left font-mono text-sm text-neutral-400 hover:text-white"
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
