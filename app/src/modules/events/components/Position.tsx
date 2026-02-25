import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { AccordeonToggle } from "@/modules/common/components/Accordeon";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { EditableInput } from "@/modules/common/components/form/EditableInput";
import { VariantWithLogo } from "@/modules/fleet/components/VariantWithLogo";
import {
  type Entity,
  type EventPosition,
  type EventPositionApplication,
  type EventPositionRequiredVariant,
  type Manufacturer,
  type Series,
  type Ship,
  type Upload,
  type Variant,
} from "@prisma/client";
import clsx from "clsx";
import { updateEventPositionName } from "../actions/updateEventPositionName";
import { checkRequirements } from "../utils/checkRequirements";
import { CreateOrUpdateEventPosition } from "./CreateOrUpdateEventPosition";
import { DeleteEventPosition } from "./DeleteEventPosition";
import { useLineupOrder } from "./LineupOrderContext/Context";
import { DragHandle } from "./LineupOrderContext/DragHandle";
import { DragTarget } from "./LineupOrderContext/DragTarget";
import { useLineupVisibility } from "./LineupVisibilityContext";
import { PositionVariants } from "./PositionVariants";
import { ToggleEventPositionApplicationForCurrentUser } from "./ToggleEventPositionApplicationForCurrentUser";
import { UpdateEventPositionCitizenId } from "./UpdateEventPositionCitizenId";

export type PositionType = EventPosition & {
  applications: (EventPositionApplication & {
    citizen: Entity;
  })[];
  requiredVariants: (EventPositionRequiredVariant & {
    variant: Variant & {
      series: Series & {
        manufacturer: Manufacturer & {
          image: Upload | null;
        };
      };
    };
  })[];
  citizen: Entity | null;
  childPositions?: PositionType[];
};

interface Props {
  readonly className?: string;
  readonly position: PositionType;
  readonly showManage?: boolean;
  readonly variants: (Manufacturer & {
    series: (Series & {
      variants: Variant[];
    })[];
  })[];
  readonly myShips: Ship[];
  readonly allEventCitizens: { citizen: Entity; ships: Ship[] }[];
  readonly showActions?: boolean;
  readonly groupLevel: number;
  readonly parentPositions: PositionType["id"][];
}

export const Position = ({
  className,
  position,
  showManage,
  variants,
  myShips,
  allEventCitizens,
  showActions,
  groupLevel,
  parentPositions,
}: Props) => {
  const authentication = useAuthentication();
  if (!authentication) throw new Error("Unauthorized");

  const { isDragging } = useLineupOrder();

  const { openItems, open, close } = useLineupVisibility();
  const isOpen = openItems.includes(position.id);

  const hasCurrentUserAlreadyApplied = position.applications.some(
    (application) =>
      application.citizen.id === authentication.session.entity?.id,
  );

  const handleToggleOpen = () => {
    if (isOpen) {
      close(position.id);
    } else {
      open(position.id);
    }
  };

  const {
    doesCurrentUserSatisfyRequirements,
    citizensSatisfyingRequirements,
    citizensNotSatisfyingRequirements,
    applicationsSatisfyingRequirements,
    applicationsNotSatisfyingRequirements,
  } = checkRequirements(position, myShips, allEventCitizens);

  const newParentPositions = [...parentPositions, position.id];

  const isCurrentUserEventCitizen = allEventCitizens.some(
    (citizen) => citizen.citizen.id === authentication.session.entity?.id,
  );

  return (
    <div
      className={clsx(
        "@container",
        {
          "opacity-50": isDragging?.id === position.id,
        },
        className,
      )}
    >
      {showActions && showManage && (
        <DragTarget
          position={position}
          order="before"
          parentPositions={newParentPositions}
          groupLevel={groupLevel}
        />
      )}

      <div
        className={clsx("flex items-stretch gap-2 bg-neutral-800/50", {
          "bg-neutral-800/70 rounded-t": isOpen,
          "rounded-b": !isOpen,
        })}
      >
        {showActions && showManage && <DragHandle position={position} />}

        <div className="flex-1 flex flex-col @3xl:grid @3xl:grid-cols-[1fr_256px_256px] gap-2">
          <div className="flex flex-col justify-center overflow-hidden pl-2">
            <h3
              className={clsx(
                "text-sm text-gray-500 font-mono uppercase text-xs",
                {
                  "sr-only": !isOpen,
                },
              )}
            >
              Name
            </h3>

            {showManage ? (
              <EditableInput
                rowId={position.id}
                columnName="name"
                initialValue={position.name}
                action={updateEventPositionName}
                className="font-bold"
              />
            ) : (
              <p className="truncate font-bold">{position.name}</p>
            )}
          </div>

          <div className="flex flex-col justify-center py-1">
            <h3
              className={clsx(
                "text-sm text-gray-500 font-mono uppercase text-xs",
                {
                  "sr-only": !isOpen,
                },
              )}
            >
              Erforderliches Schiff
            </h3>
            {position.requiredVariants.length <= 0 && (
              <p className="text-neutral-500">-</p>
            )}
            {position.requiredVariants.length === 1 && (
              <VariantWithLogo
                key={position.requiredVariants[0].id}
                variant={position.requiredVariants[0].variant}
                manufacturer={
                  position.requiredVariants[0].variant.series.manufacturer
                }
                size={32}
              />
            )}
            {position.requiredVariants.length > 1 && (
              <PositionVariants position={position} />
            )}
          </div>

          <div className="flex flex-col justify-center py-1">
            <h3
              className={clsx(
                "text-sm text-gray-500 font-mono uppercase text-xs",
                {
                  "sr-only": !isOpen,
                },
              )}
            >
              Citizen
            </h3>

            {showManage ? (
              <UpdateEventPositionCitizenId
                position={position}
                className="mt-1"
                citizensSatisfyingRequirements={citizensSatisfyingRequirements}
                citizensNotSatisfyingRequirements={
                  citizensNotSatisfyingRequirements
                }
                applicationsSatisfyingRequirements={
                  applicationsSatisfyingRequirements
                }
                applicationsNotSatisfyingRequirements={
                  applicationsNotSatisfyingRequirements
                }
              />
            ) : position.citizen ? (
              <CitizenLink citizen={position.citizen} />
            ) : (
              <p className="text-neutral-500">-</p>
            )}
          </div>
        </div>

        <AccordeonToggle onClick={handleToggleOpen} isOpen={isOpen} />
      </div>

      {isOpen && (
        <div className="bg-neutral-800/50 border-t border-white/10 rounded-b">
          <div className="p-4 flex gap-2">
            <div className="flex-1 flex flex-col">
              <h3 className="text-sm text-gray-500 font-mono uppercase text-xs">
                Beschreibung
              </h3>
              {position.description ? (
                <p>{position.description}</p>
              ) : (
                <p className="text-neutral-500">-</p>
              )}
            </div>

            {/* TODO: Implement (multiple) role requirements */}
            {/* <div className="flex-1 flex flex-col">
              <h3 className="text-sm text-gray-500">
                Erforderliche Ränge/Zertifikate
              </h3>
              <p>-</p>
            </div> */}
          </div>

          {(showActions || showManage) && (
            <div className="flex flex-row-reverse justify-between border-t border-white/10 p-2">
              <div className="justify-self-end">
                <ToggleEventPositionApplicationForCurrentUser
                  position={position}
                  hasCurrentUserAlreadyApplied={hasCurrentUserAlreadyApplied}
                  doesCurrentUserSatisfyRequirements={
                    doesCurrentUserSatisfyRequirements
                  }
                  showDiscordWarning={!isCurrentUserEventCitizen}
                />
              </div>

              {showManage && (
                <div className="flex items-center justify-center gap-2">
                  {groupLevel < 4 && (
                    <CreateOrUpdateEventPosition
                      eventId={position.eventId}
                      parentPositionId={position.id}
                      variants={variants}
                      className="flex-none"
                    />
                  )}
                  <CreateOrUpdateEventPosition
                    position={position}
                    variants={variants}
                    className="flex-none"
                  />
                  <DeleteEventPosition
                    position={position}
                    className="flex-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showActions && showManage && (
        <DragTarget
          position={position}
          order="after"
          parentPositions={newParentPositions}
          groupLevel={groupLevel}
        />
      )}

      {position.childPositions && position.childPositions.length > 0 && (
        <div className="flex flex-col gap-[1px] pl-4 lg:pl-8 mt-[1px]">
          {position.childPositions.map((position) => (
            <Position
              key={position.id}
              position={position}
              showManage={showManage}
              variants={variants}
              myShips={myShips}
              allEventCitizens={allEventCitizens}
              showActions={showActions}
              groupLevel={groupLevel + 1}
              parentPositions={newParentPositions}
            />
          ))}
        </div>
      )}
    </div>
  );
};
