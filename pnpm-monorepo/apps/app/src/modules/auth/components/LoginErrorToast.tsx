"use client";

import { toastWarning } from "@/modules/actions/utils/toastWarning";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { isLoginError, LoginError } from "../utils/loginError";

enum ToastType {
  Info = "info",
  Warning = "warning",
  Error = "error",
}

interface Content {
  readonly message: string;
  readonly type: ToastType;
}

/**
 * Also for the codes that disclose too much, for example
 * `OAuthAccountNotLinked` of next-auth: it tells that a different user has
 * the email address of the Discord account.
 */
const GENERIC_CONTENT: Content = {
  message:
    "Beim Anmelden ist ein Fehler aufgetreten. Versuche es erneut oder wende dich an einen Admin, wenn der Fehler bleibt.",
  type: ToastType.Error,
};

const getContent = (error: string): Content => {
  if (!isLoginError(error)) return GENERIC_CONTENT;

  switch (error) {
    case LoginError.UserBanned:
      return { message: "Dein Account wurde gesperrt.", type: ToastType.Error };

    case LoginError.NotGuildMember:
      return {
        message:
          "Dieser Discord-Account ist kein Mitglied unseres Discord-Servers. Prüfe, ob du im Browser mit dem richtigen Discord-Account angemeldet bist.",
        type: ToastType.Error,
      };

    case LoginError.LoginCancelled:
      return {
        message: "Du hast die Anmeldung bei Discord abgebrochen.",
        type: ToastType.Info,
      };

    case LoginError.DiscordUnavailable:
      return {
        message:
          "Discord ist gerade nicht erreichbar. Versuche es in ein paar Minuten erneut.",
        type: ToastType.Warning,
      };

    case LoginError.DiscordEmailMissing:
      return {
        message:
          "Dein Discord-Account hat keine E-Mail-Adresse. Hinterlege eine in Discord und melde dich erneut an.",
        type: ToastType.Error,
      };

    case LoginError.OAuthCallback:
      return {
        message:
          "Die Anmeldung bei Discord ist abgelaufen oder wurde in einem anderen Browser abgeschlossen. Starte die Anmeldung erneut.",
        type: ToastType.Error,
      };

    case LoginError.LoginFailed:
      return GENERIC_CONTENT;

    default:
      throw new Error(`Unknown login error: ${error satisfies never}`);
  }
};

/** The effect runs two times in development (Strict Mode) */
const TOAST_ID = "login-error";

const showToast = ({ message, type }: Content) => {
  switch (type) {
    case ToastType.Info:
      toast(message, { id: TOAST_ID });
      break;

    case ToastType.Warning:
      toastWarning(message, { id: TOAST_ID });
      break;

    case ToastType.Error:
      toast.error(message, { id: TOAST_ID });
      break;

    default:
      throw new Error(`Unknown toast type: ${type satisfies never}`);
  }
};

interface Props {
  /** The value of the `error` search param, thus any string */
  readonly error: string;
}

/**
 * Shows the login error one time: the error leaves the URL, thus a reload
 * does not show it again.
 */
export const LoginErrorToast = ({ error }: Props) => {
  useEffect(() => {
    showToast(getContent(error));

    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url);
  }, [error]);

  return null;
};
