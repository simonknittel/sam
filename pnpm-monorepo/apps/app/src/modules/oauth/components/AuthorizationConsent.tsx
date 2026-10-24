import { Tile } from "@/modules/common/components/Tile";
import type {
  AuthorizationRequestValidation,
  AuthorizationRequestValidationKind,
} from "@sam-monorepo/application";
import { listToolCatalogGroups } from "@sam-monorepo/mcp";
import { getRedirectTarget, toConsentFormParameters } from "../utils/consent";
import { ConsentDecision } from "./ConsentDecision";

interface Props {
  readonly validation: Extract<
    AuthorizationRequestValidation,
    { kind: AuthorizationRequestValidationKind.Valid }
  >;
}

/**
 * Asks the user to connect a client. The host of the client id is the only
 * trusted identity of the client: the client gives its name itself.
 */
export const AuthorizationConsent = ({ validation }: Props) => {
  return (
    <Tile heading="Zugriff erlauben" childrenClassName="flex flex-col gap-4">
      <div>
        <p className="text-sm text-neutral-500">
          Diese Anwendung möchte in deinem Namen auf SAM zugreifen:
        </p>
        <p className="mt-1 text-2xl font-bold wrap-break-word">
          {validation.client.clientName}
        </p>
        <p className="break-all">{new URL(validation.client.clientId).host}</p>
      </div>

      <ConsentDecision
        parameters={toConsentFormParameters(validation)}
        clientName={validation.client.clientName}
        toolGroups={listToolCatalogGroups()}
      />

      <p className="text-right text-sm break-all text-neutral-500">
        Du wirst weitergeleitet zu {getRedirectTarget(validation.redirectUri)}
      </p>
    </Tile>
  );
};
