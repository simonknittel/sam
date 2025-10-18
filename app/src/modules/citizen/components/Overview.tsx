import { requireAuthentication } from "@/modules/auth/server";
import { CopyToClipboard } from "@/modules/common/components/CopyToClipboard";
import { RSIButton } from "@/modules/common/components/RSIButton";
import { Tile } from "@/modules/common/components/Tile";
import { type Entity } from "@prisma/client";
import clsx from "clsx";
import { Suspense } from "react";
import { FaDiscord, FaTeamspeak } from "react-icons/fa";
import { RiTimeLine } from "react-icons/ri";
import { DeleteCitizen } from "./DeleteCitizen";
import { LastSeenAt } from "./LastSeenAt";
import { OverviewSection } from "./generic-log-type/OverviewSection";

interface Props {
  readonly className?: string;
  readonly entity: Entity;
}

export const Overview = async ({ className, entity }: Props) => {
  const authentication = await requireAuthentication();
  const [showDiscordId, showTeamspeakId, showLastSeen, showDelete] =
    await Promise.all([
      authentication.authorize("discord-id", "read"),
      authentication.authorize("teamspeak-id", "read"),
      authentication.authorize("lastSeen", "read"),
      authentication.authorize("citizen", "delete"),
    ]);

  return (
    <div className={clsx(className)}>
      <Tile heading="Übersicht">
        <dl>
          <dt className="text-neutral-500">Internal ID</dt>
          <dd className="flex items-center gap-2">
            {entity.id}
            <CopyToClipboard value={entity.id} />
          </dd>

          <dt className="text-neutral-500 mt-4">Spectrum ID</dt>
          <dd>{entity.spectrumId || <span className="italic">-</span>}</dd>

          <OverviewSection
            type="citizen-id"
            name="Citizen ID"
            entity={entity}
          />

          <OverviewSection type="handle" name="Handle" entity={entity} />

          <OverviewSection
            type="community-moniker"
            name="Community Moniker"
            entity={entity}
          />

          {showDiscordId && (
            <OverviewSection
              type="discord-id"
              icon={<FaDiscord />}
              name="Discord ID"
              entity={entity}
            />
          )}

          {showTeamspeakId && (
            <OverviewSection
              type="teamspeak-id"
              icon={<FaTeamspeak />}
              name="TeamSpeak ID"
              entity={entity}
            />
          )}

          {showLastSeen && (
            <>
              <dt className="text-neutral-500 mt-4 flex gap-2 items-center">
                <RiTimeLine />
                Zuletzt gesehen
              </dt>
              <dd className="flex gap-4 items-center">
                <Suspense
                  fallback={
                    <div className="bg-neutral-800 animate-pulse rounded-secondary h-6 w-20" />
                  }
                >
                  <LastSeenAt entity={entity} />
                </Suspense>
              </dd>
            </>
          )}
        </dl>

        {entity.handle && (
          <RSIButton
            className="mt-4"
            href={`https://robertsspaceindustries.com/citizens/${entity.handle}`}
          />
        )}
      </Tile>

      {showDelete && <DeleteCitizen entity={entity} className="mx-auto mt-2" />}
    </div>
  );
};
