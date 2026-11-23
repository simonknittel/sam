import { RelayCloseReason } from "@sam-monorepo/domain";
import {
  BrowserRuntimeError,
  BrowserRuntimeErrorCode,
  ChannelStatus,
  RelayAvailability,
  type BrowserRuntimeState,
} from "@sam-monorepo/remote-control-program-runtime";

/** The texts of the section "Dieser Browser" for the states of the browser runtime */

export const BROWSER_RUNTIME_ERROR_TEXTS: Readonly<
  Record<BrowserRuntimeErrorCode, string>
> = {
  [BrowserRuntimeErrorCode.ReadFailed]:
    "Der Log-Ordner konnte nicht gelesen werden.",
  [BrowserRuntimeErrorCode.NotSupported]:
    "Dieser Browser unterstützt die Laufzeit nicht.",
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
export const getRelayStatusText = (state: BrowserRuntimeState) => {
  switch (state.relayAvailability) {
    case RelayAvailability.Unknown:
      return state.isRunning ? "Verbinde …" : "Nicht verbunden";

    case RelayAvailability.NotConfigured:
      return "Nur auf diesem Rechner";

    case RelayAvailability.Refused:
      return "Abgelehnt";

    case RelayAvailability.Available:
      break;

    default:
      throw new Error(
        `Unknown relay availability: ${state.relayAvailability satisfies never}`,
      );
  }

  const { channel } = state;
  if (!channel) return "Nicht verbunden";

  switch (channel.status) {
    case ChannelStatus.Idle:
      return "Nicht verbunden";

    case ChannelStatus.Connecting:
      return "Verbinde …";

    case ChannelStatus.Connected:
      return channel.isStoppedByOwner
        ? "Verbunden, alles gestoppt"
        : "Verbunden";

    case ChannelStatus.WaitingForReconnect:
      return "Verbinde gleich neu …";

    case ChannelStatus.Ended:
      return "Getrennt";

    default:
      throw new Error(
        `Unknown channel status: ${channel.status satisfies never}`,
      );
  }
};

/** Why the relay refused or closed the connection */
export const RELAY_CLOSE_REASON_TEXTS: Readonly<
  Record<RelayCloseReason, string>
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
  [RelayCloseReason.AccessDenied]:
    "Das Relay lehnt diesen Browser ab: Dir fehlt die Berechtigung, oder dein Account ist gesperrt.",
  [RelayCloseReason.ProgramTurnedOff]:
    "Die Organisation hat das Remote Control Program abgeschaltet.",
  [RelayCloseReason.Replaced]:
    "Eine neuere Verbindung dieses Browsers hat übernommen.",
  [RelayCloseReason.HeartbeatMissing]: "Die Verbindung war unterbrochen.",
};

export const formatEntryCount = (count: number) =>
  count === 1 ? "1 Eintrag" : `${count.toLocaleString("de")} Einträge`;
