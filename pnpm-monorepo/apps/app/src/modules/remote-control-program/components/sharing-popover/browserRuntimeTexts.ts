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

/** The texts of the section "Dieser Browser" for the states of the browser runtime */

export const BROWSER_RUNTIME_ERROR_TEXTS: Readonly<
  Record<BrowserRuntimeErrorCode, string>
> = {
  [BrowserRuntimeErrorCode.ReadFailed]:
    "Der Log-Ordner konnte nicht gelesen werden.",
  [BrowserRuntimeErrorCode.NotSupported]: BROWSER_NOT_SUPPORTED_TEXT,
  [BrowserRuntimeErrorCode.NoAnswer]:
    "Der Tab mit der Laufzeit hat nicht geantwortet. Versuche es erneut.",
  [BrowserRuntimeErrorCode.FolderNotGranted]:
    "Wähle zuerst den Log-Ordner aus, oder erlaube den Zugriff.",
  [BrowserRuntimeErrorCode.NotRunning]:
    "Die Laufzeit läuft nicht. Starte sie, um ältere Einträge hochzuladen.",
  [BrowserRuntimeErrorCode.RelayNotAvailable]:
    "Dieser Browser ist nicht mit dem Relay verbunden und kann nichts hochladen.",
  [BrowserRuntimeErrorCode.RelayCheckFailed]:
    "SAM konnte nicht prüfen, welche Einträge schon hochgeladen sind. Versuche es erneut.",
  [BrowserRuntimeErrorCode.RequestExpired]:
    "Die Zählung ist veraltet. Prüfe die neuen Zahlen und bestätige erneut.",
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
      return isRunning ? "Verbinde …" : "Nicht verbunden";

    case ChannelStatus.Connecting:
      return "Verbinde …";

    case ChannelStatus.Connected:
      return channel.isStoppedByOwner
        ? "Verbunden, alles gestoppt"
        : "Verbunden";

    case ChannelStatus.WaitingForReconnect:
      return "Verbinde gleich neu …";

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
    "Die Anmeldung beim Relay ist abgelaufen. Der Browser verbindet sich neu.",
  [RelayCloseReason.UpdateNecessary]:
    "SAM hat eine neue Version. Lade die Seite neu, damit dieser Browser wieder hochlädt.",
  [RelayCloseReason.ProtocolVersionTooNew]:
    "Das Relay kennt diese Version von SAM noch nicht. Versuche es später erneut.",
  [RelayCloseReason.RelayServiceRestart]:
    "Das Relay startet neu. Der Browser verbindet sich gleich wieder.",
  [RelayCloseReason.TooManyErrors]:
    "Das Relay hat die Verbindung nach zu vielen Fehlern getrennt.",
  [RelayCloseReason.TooManyRuntimes]:
    "Zu viele deiner Laufzeiten sind verbunden. Stoppe eine andere Laufzeit.",
  [RelayCloseReason.AccessDenied]: ACCESS_DENIED_TEXT,
  [RelayCloseReason.ProgramTurnedOff]:
    "Die Organisation hat das Remote Control Program abgeschaltet.",
  [RelayCloseReason.Replaced]:
    "Eine neuere Verbindung dieses Browsers hat übernommen.",
  [RelayCloseReason.HeartbeatMissing]: "Die Verbindung war unterbrochen.",
  [ChannelEndReason.NoRelay]: NO_RELAY_TEXT,
  [ChannelEndReason.SessionExpired]: SESSION_EXPIRED_TEXT,
  [ChannelEndReason.CitizenChanged]:
    "In diesem Browser ist jetzt ein anderer Account angemeldet. Lade die Seite neu.",
};

export const formatEntryCount = (count: number) =>
  count === 1 ? "1 Eintrag" : `${count.toLocaleString("de")} Einträge`;
