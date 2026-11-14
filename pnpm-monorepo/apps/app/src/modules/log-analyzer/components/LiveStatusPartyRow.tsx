import clsx from "clsx";
import { FaCrown, FaPeopleGroup } from "react-icons/fa6";
import type { LiveStatusParty } from "../utils/liveStatus";
import { LiveStatusSince } from "./LiveStatusSince";
import { LiveStatusUncertainLabel } from "./LiveStatusUncertainLabel";

interface Props {
  readonly party: LiveStatusParty;
  readonly now: Date;
}

export const LiveStatusPartyRow = ({ party, now }: Props) => {
  const members = party.members.join(", ");

  return (
    <li className={clsx({ "opacity-60": party.isUncertain })}>
      <div className="flex items-center gap-2">
        <FaPeopleGroup className="shrink-0 text-white/40" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Party</span>
        {party.isUncertain && <LiveStatusUncertainLabel />}
        <LiveStatusSince since={party.since} now={now} />
      </div>

      {party.leader && (
        <p
          className="ml-6 flex items-center gap-1 text-xs text-white/60"
          title={`Leader: ${party.leader}`}
        >
          <FaCrown className="shrink-0" aria-hidden />
          <span className="truncate">{party.leader}</span>
        </p>
      )}

      {/* The game names only the members who joined after the reporter */}
      {members && (
        <p
          className="ml-6 truncate text-xs text-white/60"
          title={`Bekannte Mitglieder: ${members}`}
        >
          Bekannte Mitglieder: {members}
        </p>
      )}
    </li>
  );
};
