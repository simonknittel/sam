import { LogEntryUploadState } from "@/modules/remote-control-program/consumer/logEntryUploadState";
import { FaCloud, FaLaptop } from "react-icons/fa6";

interface Props {
  readonly uploadState: LogEntryUploadState;
}

/** Nothing while it is not known */
export const EntryUploadState = ({ uploadState }: Props) => {
  switch (uploadState) {
    case LogEntryUploadState.Uploaded:
      return (
        <span role="img" aria-label="Hochgeladen" title="Hochgeladen">
          <FaCloud aria-hidden />
        </span>
      );

    case LogEntryUploadState.LocalOnly:
      return (
        <span
          role="img"
          aria-label="Nur auf diesem Computer"
          title="Nur auf diesem Computer"
        >
          <FaLaptop aria-hidden />
        </span>
      );

    case LogEntryUploadState.Unknown:
      return null;

    default:
      throw new Error(`Unknown upload state: ${uploadState satisfies never}`);
  }
};
