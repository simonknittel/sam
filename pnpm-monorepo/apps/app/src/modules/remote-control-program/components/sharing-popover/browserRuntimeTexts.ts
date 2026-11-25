import { RelayCloseReason } from "@sam-monorepo/domain";
import {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  ChannelEndReason,
  ChannelStatus,
  type BrowserRuntimeState,
  type ChannelCloseReason,
} from "@sam-monorepo/remote-control-program-runtime";
import {
  ACCESS_DENIED_TEXT,
  BROWSER_NOT_SUPPORTED_TEXT,
  NO_RELAY_TEXT,
  SESSION_EXPIRED_TEXT,
} from "../../utils/remoteControlProgramTexts";

/** The texts of the section "Browser" for the states of the browser runtime */

export const BROWSER_RUNTIME_ERROR_TEXTS: Readonly<
  Record<BrowserRuntimeErrorCode, string>
> = {
  [BrowserRuntimeErrorCode.ReadFailed]:
    "Der Log-Ordner konnte nicht gelesen werden.",
  [BrowserRuntimeErrorCode.NotSupported]: BROWSER_NOT_SUPPORTED_TEXT,
  [BrowserRuntimeErrorCode.NoAnswer]:
    "Der Tab mit der Runtime hat nicht geantwortet. Versuche es erneut.",
  [BrowserRuntimeErrorCode.FolderNotGranted]:
    "Wähle zuerst den Log-Ordner aus oder erlaube den Zugriff darauf.",
  [BrowserRuntimeErrorCode.NotRunning]:
    "Die Runtime läuft gerade nicht. Starte sie, um ältere Einträge hochzuladen.",
  [BrowserRuntimeErrorCode.RelayNotAvailable]:
    "Dieser Browser ist nicht mit dem Relay verbunden und kann nichts hochladen.",
  [BrowserRuntimeErrorCode.RelayCheckFailed]:
    "Es konnte nicht geprüft werden, welche Einträge schon hochgeladen sind. Versuche es erneut.",
  [BrowserRuntimeErrorCode.RequestExpired]:
    "Die Anzahl hat sich geändert. Prüfe sie und bestätige noch einmal.",
};

/** The text of a failed command of the browser runtime */
export const getBrowserRuntimeErrorText = (error: unknown) =>
  error instanceof BrowserRuntimeError
    ? BROWSER_RUNTIME_ERROR_TEXTS[error.code]
    : "Das hat nicht geklappt. Versuche es erneut.";

/** The short state of the connection to the relay */
export const getRelayStatusText = ({
  isRunning,
  channel,
}: BrowserRuntimeState) => {
  switch (channel.status) {
    case ChannelStatus.Idle:
      return isRunning ? "Wird verbunden …" : "Nicht verbunden";

    case ChannelStatus.Connecting:
      return "Wird verbunden …";

    case ChannelStatus.Connected:
      return channel.isStoppedByOwner
        ? "Verbunden, alles gestoppt"
        : "Verbunden";

    case ChannelStatus.WaitingForReconnect:
      return "Wird gleich neu verbunden …";

    // The note of the close reason tells why
    case ChannelStatus.Ended:
      return channel.closeReason === ChannelEndReason.NoRelay
        ? "Nur auf diesem Rechner"
        : "Getrennt";

    default:
      throw new Error(
        `Unknown channel status: ${channel.status satisfies never}`,
      );
  }
};

/** Why the app or the relay refused or closed the connection */
export const CHANNEL_CLOSE_REASON_TEXTS: Readonly<
  Record<ChannelCloseReason, string>
> = {
  [RelayCloseReason.TokenNotValid]:
    "Die Anmeldung beim Relay ist abgelaufen. Die Verbindung wird neu aufgebaut.",
  [RelayCloseReason.UpdateNecessary]:
    "Es gibt eine neue Version von SAM. Lade die Seite neu, um wieder hochzuladen.",
  [RelayCloseReason.ProtocolVersionTooNew]:
    "Das Relay unterstützt diese Version von SAM noch nicht. Versuche es später erneut.",
  [RelayCloseReason.RelayServiceRestart]:
    "Das Relay startet gerade neu. Die Verbindung wird gleich wieder aufgebaut.",
  [RelayCloseReason.TooManyErrors]:
    "Das Relay hat die Verbindung wegen zu vieler Fehler getrennt.",
  [RelayCloseReason.TooManyRuntimes]:
    "Es sind zu viele deiner Runtimes verbunden. Stoppe zuerst eine andere.",
  [RelayCloseReason.AccessDenied]: ACCESS_DENIED_TEXT,
  [RelayCloseReason.ProgramTurnedOff]:
    "Das Remote Control Program ist derzeit abgeschaltet.",
  [RelayCloseReason.Replaced]:
    "Dieser Browser ist inzwischen über einen anderen Tab verbunden.",
  [RelayCloseReason.HeartbeatMissing]: "Die Verbindung war unterbrochen.",
  [ChannelEndReason.NoRelay]: NO_RELAY_TEXT,
  [ChannelEndReason.SessionExpired]: SESSION_EXPIRED_TEXT,
  [ChannelEndReason.CitizenChanged]:
    "In diesem Browser ist jetzt ein anderer Account angemeldet. Lade die Seite neu.",
};

export const formatEntryCount = (count: number) =>
  count === 1 ? "1 Eintrag" : `${count.toLocaleString("de")} Einträge`;
