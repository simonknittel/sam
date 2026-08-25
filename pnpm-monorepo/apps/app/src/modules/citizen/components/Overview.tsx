import { requireAuthentication } from "@/modules/auth/server";
import { CopyToClipboard } from "@/modules/common/components/CopyToClipboard";
import { RSIButton } from "@/modules/common/components/RSIButton";
import { Tile } from "@/modules/common/components/Tile";
import { type Entity } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { Suspense } from "react";
import {
  FaBirthdayCake,
  FaDiscord,
  FaGlobe,
  FaTeamspeak,
} from "react-icons/fa";
import { RiTimeLine } from "react-icons/ri";
import { formatBirthday } from "../utils/birthday";
import { DeleteCitizen } from "./DeleteCitizen";
import { LastSeenAt } from "./LastSeenAt";
import { LocalTime } from "./LocalTime";
import { ProfileAttribute } from "./ProfileAttribute";
import { OverviewSection } from "./generic-log-type/OverviewSection";

interface Props {
  readonly className?: string;
  readonly entity: Pick<
    Entity,
    | "id"
    | "handle"
    | "spectrumId"
    | "discordId"
    | "teamspeakId"
    | "citizenId"
    | "communityMoniker"
    | "timezone"
    | "birthdayDay"
    | "birthdayMonth"
  >;
}

export const Overview = async ({ className, entity }: Props) => {
  const authentication = await requireAuthentication();
  /**
   * Both attributes are set by the citizen themselves and need no permission
   * of their own, the same rule the citizen popover follows.
   */
  const birthday =
    entity.birthdayDay !== null && entity.birthdayMonth !== null
      ? formatBirthday(entity.birthdayDay, entity.birthdayMonth)
      : null;
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
        <dl className="flex flex-col gap-1 text-sm">
          <ProfileAttribute name="Internal ID">
            <span className="truncate" title={entity.id}>
              {entity.id}
            </span>

            <CopyToClipboard value={entity.id} />
          </ProfileAttribute>

          <ProfileAttribute name="Spectrum ID">
            {entity.spectrumId ? (
              <span className="truncate" title={entity.spectrumId}>
                {entity.spectrumId}
              </span>
            ) : (
              <span className="italic">-</span>
            )}
          </ProfileAttribute>

          <OverviewSection
            type="citizen-id"
            name="Citizen ID"
            value={entity.citizenId}
            entity={entity}
          />

          <OverviewSection
            type="handle"
            name="Handle"
            value={entity.handle}
            entity={entity}
          />

          <OverviewSection
            type="community-moniker"
            name="Community Moniker"
            value={entity.communityMoniker}
            entity={entity}
          />

          {showDiscordId && (
            <OverviewSection
              type="discord-id"
              icon={<FaDiscord />}
              name="Discord ID"
              value={entity.discordId}
              entity={entity}
            />
          )}

          {showTeamspeakId && (
            <OverviewSection
              type="teamspeak-id"
              icon={<FaTeamspeak />}
              name="TeamSpeak ID"
              value={entity.teamspeakId}
              entity={entity}
            />
          )}

          {showLastSeen && (
            <ProfileAttribute icon={<RiTimeLine />} name="Zuletzt gesehen">
              <Suspense
                fallback={
                  <div className="bg-neutral-800 animate-pulse rounded-secondary h-5 w-20" />
                }
              >
                <LastSeenAt entity={entity} />
              </Suspense>
            </ProfileAttribute>
          )}

          <ProfileAttribute icon={<FaGlobe />} name="Zeitzone">
            {entity.timezone ? (
              <>
                <span className="truncate" title={entity.timezone}>
                  {entity.timezone}
                </span>

                <LocalTime timezone={entity.timezone} />
              </>
            ) : (
              <span className="italic">-</span>
            )}
          </ProfileAttribute>

          <ProfileAttribute icon={<FaBirthdayCake />} name="Geburtstag">
            {birthday || <span className="italic">-</span>}
          </ProfileAttribute>
        </dl>

        {entity.handle && (
          <RSIButton
            className="mt-4"
            href={`https://robertsspaceindustries.com/citizens/${entity.handle}`}
          />
        )}
      </Tile>

      {showDelete && <DeleteCitizen entity={entity} className="mt-4" />}
    </div>
  );
};
