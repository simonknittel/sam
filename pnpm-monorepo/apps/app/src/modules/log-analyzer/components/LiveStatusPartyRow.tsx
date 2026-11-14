import { FaCrown, FaPeopleGroup } from "react-icons/fa6";
import type { LiveStatusParty } from "../utils/liveStatus";
import { LiveStatusRow } from "./LiveStatusRow";

interface Props {
  readonly party: LiveStatusParty;
  readonly now: Date;
}

export const LiveStatusPartyRow = ({ party, now }: Props) => {
  const members = party.members.join(", ");

  return (
    <LiveStatusRow
      icon={FaPeopleGroup}
      label="Party"
      since={party.since}
      now={now}
      isUncertain={party.isUncertain}
    >
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
    </LiveStatusRow>
  );
};
