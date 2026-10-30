import Note from "@/modules/common/components/Note";
import type { ComponentProps } from "react";
import { isLoginError, LoginError } from "../utils/loginError";

interface Content {
  readonly message: string;
  readonly type: ComponentProps<typeof Note>["type"];
}

/**
 * Also for the codes that disclose too much, for example
 * `OAuthAccountNotLinked` of next-auth: it tells that a different user has
 * the email address of the Discord account.
 */
const GENERIC_CONTENT: Content = {
  message:
    "Beim Anmelden ist ein Fehler aufgetreten. Versuche es erneut oder wende dich an einen Admin, wenn der Fehler bleibt.",
  type: "error",
};

const getContent = (error: string): Content => {
  if (!isLoginError(error)) return GENERIC_CONTENT;

  switch (error) {
    case LoginError.UserBanned:
      return { message: "Dein Account wurde gesperrt.", type: "error" };

    case LoginError.NotGuildMember:
      return {
        message:
          "Dieser Discord-Account ist kein Mitglied unseres Discord-Servers. Prüfe, ob du im Browser mit dem richtigen Discord-Account angemeldet bist.",
        type: "error",
      };

    case LoginError.LoginCancelled:
      return {
        message: "Du hast die Anmeldung bei Discord abgebrochen.",
        type: "info",
      };

    case LoginError.DiscordUnavailable:
      return {
        message:
          "Discord ist gerade nicht erreichbar. Versuche es in ein paar Minuten erneut.",
        type: "warning",
      };

    case LoginError.DiscordEmailMissing:
      return {
        message:
          "Dein Discord-Account hat keine E-Mail-Adresse. Hinterlege eine in Discord und melde dich erneut an.",
        type: "error",
      };

    case LoginError.OAuthCallback:
      return {
        message:
          "Die Anmeldung bei Discord ist abgelaufen oder wurde in einem anderen Browser abgeschlossen. Starte die Anmeldung erneut.",
        type: "error",
      };

    case LoginError.LoginFailed:
      return GENERIC_CONTENT;

    default:
      throw new Error(`Unknown login error: ${error satisfies never}`);
  }
};

interface Props {
  /** The value of the `error` search param, thus any string */
  readonly error: string;
}

export const LoginErrorNote = ({ error }: Props) => {
  const { message, type } = getContent(error);

  return <Note className="max-w-xs lg:p-4!" message={message} type={type} />;
};
