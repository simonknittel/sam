"use client";

import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { Tooltip } from "@/modules/common/components/Tooltip";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import type {
  EventPosition,
  EventPositionRequiredVariant,
  Manufacturer,
  Series,
  Upload,
  Variant,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId, useTransition } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { createEventPositionApplicationForCurrentUser } from "../actions/createEventPositionApplicationForCurrentUser";
import { deleteEventPositionApplicationForCurrentUser } from "../actions/deleteEventPositionApplicationForCurrentUser";

interface Props {
  readonly className?: string;
  readonly position: EventPosition & {
    requiredVariants: (EventPositionRequiredVariant & {
      variant: Variant & {
        series: Series & {
          manufacturer: Manufacturer & {
            image: Upload | null;
          };
        };
      };
    })[];
  };
  readonly hasCurrentUserAlreadyApplied?: boolean;
  readonly doesCurrentUserSatisfyRequirements?: boolean;
  readonly showDiscordWarning?: boolean;
}

export const ToggleEventPositionApplicationForCurrentUser = ({
  className,
  position,
  hasCurrentUserAlreadyApplied,
  doesCurrentUserSatisfyRequirements,
  showDiscordWarning,
}: Props) => {
  const [isPending, startTransition] = useTransition();
  const formId = useId();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      await runAction(
        hasCurrentUserAlreadyApplied
          ? deleteEventPositionApplicationForCurrentUser
          : createEventPositionApplicationForCurrentUser,
        formData,
      );
    });
  };

  return (
    <form action={formAction} id={formId} className={clsx(className)}>
      <input type="hidden" name="positionId" value={position.id} />

      {hasCurrentUserAlreadyApplied && (
        <Button2 type="submit" title="Abmelden" disabled={isPending}>
          Abmelden
          {isPending ? <AsciiSpinner /> : <FaMinus />}
        </Button2>
      )}

      {!hasCurrentUserAlreadyApplied &&
        !showDiscordWarning &&
        doesCurrentUserSatisfyRequirements && (
          <Button2
            type="submit"
            title="Für diesen Posten Interesse anmelden"
            disabled={isPending}
          >
            Interesse anmelden
            {isPending ? <AsciiSpinner /> : <FaPlus />}
          </Button2>
        )}

      {!hasCurrentUserAlreadyApplied &&
        !showDiscordWarning &&
        !doesCurrentUserSatisfyRequirements && (
          <Tooltip
            asChild
            triggerChildren={
              <Button2
                title="Für diesen Posten Interesse anmelden"
                disabled={isPending}
              >
                Interesse anmelden
                {isPending ? <AsciiSpinner /> : <FaPlus />}
              </Button2>
            }
          >
            <div>
              <p>
                Du erfüllst nicht die Voraussetzungen für diesen Posten. Du
                kannst trotzdem Interesse anmelden. Bespreche mit dem
                Organisator, was du mitbringen sollst.
              </p>

              {position.requiredVariants.length > 0 && (
                <>
                  <p className="text-sm text-gray-500 mt-4">
                    Erforderliches Schiff
                  </p>
                  {position.requiredVariants.map((requiredVariant) => (
                    <VariantWithLogo
                      key={requiredVariant.id}
                      variant={requiredVariant.variant}
                      manufacturer={requiredVariant.variant.series.manufacturer}
                      size={32}
                    />
                  ))}
                </>
              )}
            </div>
          </Tooltip>
        )}

      {!hasCurrentUserAlreadyApplied && showDiscordWarning && (
        <Tooltip
          asChild
          triggerChildren={
            <Button2
              title="Für diesen Posten Interesse anmelden"
              disabled={true}
            >
              Interesse anmelden
              <FaPlus />
            </Button2>
          }
        >
          <div>
            <p>
              Du musst dich erst in Discord bei diesem Event anmelden, bevor du
              hier Interesse anmelden kannst.
            </p>
          </div>
        </Tooltip>
      )}
    </form>
  );
};
