"use client";

import { CreateOrUpdateEventPosition } from "@/modules/events/components/CreateOrUpdateEventPosition";
import type { PositionType } from "@/modules/events/components/Position";
import { PositionSkeleton } from "@/modules/events/components/PositionSkeleton";
import { toTemplateContainer } from "@/modules/events/utils/eventContainer";
import type {
  Manufacturer,
  Series,
  Variant,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import dynamic from "next/dynamic";

const Positions = dynamic(
  () =>
    import("@/modules/events/components/Positions").then(
      (mod) => mod.Positions,
    ),
  { ssr: false, loading: () => <PositionSkeleton /> },
);

interface Props {
  readonly className?: string;
  readonly templateId: string;
  readonly positions: PositionType[];
  readonly canEdit: boolean;
  readonly variants: (Manufacturer & {
    series: (Series & {
      variants: Variant[];
    })[];
  })[];
}

/**
 * The lineup blueprint of a template — the event lineup minus everything
 * about people: no sign-ups, no assignments, no publishing. Read-only for
 * viewers who may only use the template; they still need to see what they
 * would be creating.
 */
export const EventTemplateLineupTab = ({
  className,
  templateId,
  positions,
  canEdit,
  variants,
}: Props) => {
  const container = toTemplateContainer(templateId);

  return (
    <section className={clsx("flex flex-col gap-2", className)}>
      <div className="flex justify-end">
        <h2 className="sr-only">Aufstellung</h2>

        {canEdit && (
          <CreateOrUpdateEventPosition
            container={container}
            variants={variants}
          />
        )}
      </div>

      {positions.length > 0 ? (
        <Positions
          container={container}
          positions={positions}
          canManagePositions={canEdit}
          variants={variants}
          myShips={[]}
          allEventCitizens={[]}
          showActions={false}
        />
      ) : (
        <p className="rounded-primary bg-neutral-800/50 p-4">
          Keine Posten vorhanden. Events, die aus dieser Vorlage erstellt
          werden, starten dann ohne Aufstellung.
        </p>
      )}
    </section>
  );
};
