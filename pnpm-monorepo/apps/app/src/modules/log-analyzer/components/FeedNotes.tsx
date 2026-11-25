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
    "Die Einträge anderer konnten nicht geladen werden. Es wird gleich erneut versucht.",
  [LogEntriesFeedProblem.TooManyConsumers]:
    "Der Log Analyzer ist in zu vielen Tabs geöffnet. In diesem Tab erscheinen neue Einträge anderer deshalb nur etwa einmal pro Minute. Schließe am besten ein paar Tabs.",
  [LogEntriesFeedProblem.Forbidden]:
    "Du kannst die Einträge anderer gerade nicht sehen. Entweder fehlt dir eine Berechtigung, oder das Remote Control Program ist derzeit abgeschaltet. Deine eigenen Einträge aus diesem Browser siehst du weiterhin.",
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
          message={`In diesem Zeitraum gibt es mehr Einträge, als der Log Analyzer laden kann. Einträge bis ${formatDate(incompleteUntil)} können fehlen. Wähle einen kürzeren Zeitraum, um alle zu sehen.`}
        />
      )}
    </>
  );
};
