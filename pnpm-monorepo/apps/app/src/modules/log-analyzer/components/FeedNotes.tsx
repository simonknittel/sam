"use client";

import Note from "@/modules/common/components/Note";
import { formatDate } from "@/modules/common/utils/formatDate";
import {
  LogEntriesFeedProblem,
  RelayFeedAvailability,
} from "@/modules/remote-control-program/consumer/LogEntriesFeedConsumer";
import {
  NO_RELAY_TEXT,
  SESSION_EXPIRED_TEXT,
} from "@/modules/remote-control-program/utils/remoteControlProgramTexts";
import type { ComponentProps } from "react";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const PROBLEM_TEXTS: Readonly<Record<LogEntriesFeedProblem, string>> = {
  [LogEntriesFeedProblem.RequestFailed]:
    "SAM konnte die geteilten Einträge nicht laden. Der Log Analyzer versucht es gleich erneut.",
  [LogEntriesFeedProblem.TooManyConsumers]:
    "Der Log Analyzer ist in zu vielen Tabs offen. In diesem Tab erscheinen neue Einträge anderer nur etwa einmal in der Minute. Schließe die anderen Tabs.",
  [LogEntriesFeedProblem.Forbidden]:
    "Du kannst keine geteilten Einträge lesen: Dir fehlt eine Berechtigung, oder die Organisation hat das Remote Control Program oder die Log-Einträge abgeschaltet. Deine eigenen Einträge aus diesem Browser siehst du weiterhin.",
  [LogEntriesFeedProblem.SessionExpired]: SESSION_EXPIRED_TEXT,
};

const PROBLEM_NOTE_TYPES: Readonly<
  Record<
    LogEntriesFeedProblem,
    NonNullable<ComponentProps<typeof Note>["type"]>
  >
> = {
  [LogEntriesFeedProblem.RequestFailed]: "warning",
  [LogEntriesFeedProblem.TooManyConsumers]: "warning",
  [LogEntriesFeedProblem.Forbidden]: "error",
  [LogEntriesFeedProblem.SessionExpired]: "error",
};

/**
 * Tells why entries of the relay can be missing: the own entries of the
 * other machines and the entries of the citizens who share with the user
 */
export const FeedNotes = () => {
  const { feed } = useLogAnalyzerContext();
  const { relayAvailability, problem, incompleteUntil } = feed;

  return (
    <>
      {relayAvailability === RelayFeedAvailability.NotConfigured && (
        <Note type="info" message={NO_RELAY_TEXT} />
      )}

      {problem && (
        <Note
          type={PROBLEM_NOTE_TYPES[problem]}
          message={PROBLEM_TEXTS[problem]}
        />
      )}

      {incompleteUntil && (
        <Note
          type="info"
          message={`Der Zeitraum hat mehr Einträge, als der Log Analyzer laden kann. Einträge bis ${formatDate(incompleteUntil)} können fehlen. Wähle einen kürzeren Zeitraum.`}
        />
      )}
    </>
  );
};
