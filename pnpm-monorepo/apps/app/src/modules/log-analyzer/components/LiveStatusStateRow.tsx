import { LIVE_STATUS_KINDS, type LiveStatusState } from "../utils/liveStatus";
import { LiveStatusRow } from "./LiveStatusRow";

interface Props {
  readonly state: LiveStatusState;
  readonly now: Date;
}

export const LiveStatusStateRow = ({ state, now }: Props) => {
  const { title, icon } = LIVE_STATUS_KINDS[state.kind];

  return (
    <LiveStatusRow
      icon={icon}
      label={title}
      value={state.label}
      since={state.since}
      now={now}
      isUncertain={state.isUncertain}
    />
  );
};
