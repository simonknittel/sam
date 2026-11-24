import { Button2 } from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { Tile } from "@/modules/common/components/Tile";
import { getRedirectTarget } from "../utils/consent";

interface Props {
  readonly message: string;
  /**
   * The error response for the client, only when the client and the redirect
   * URI are valid. The page shows it as a link and never redirects.
   */
  readonly errorResponseUrl?: string;
}

export const AuthorizationNotice = ({ message, errorResponseUrl }: Props) => (
  <Tile heading="Zugriff erlauben" childrenClassName="flex flex-col gap-4">
    <Note type="error" message={message} />

    {errorResponseUrl ? (
      <>
        <div className="flex justify-end">
          <Button2 as="a" href={errorResponseUrl}>
            Zurück zur Anwendung
          </Button2>
        </div>

        <p className="text-right text-sm break-all text-neutral-500">
          Du wirst weitergeleitet zu {getRedirectTarget(errorResponseUrl)}
        </p>
      </>
    ) : (
      <p className="text-sm text-neutral-500">
        Du kannst diese Seite schließen und die Verbindung in der Anwendung neu
        starten.
      </p>
    )}
  </Tile>
);
